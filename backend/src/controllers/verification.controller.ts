import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { PartyRole, VerificationStatus } from '@prisma/client';

const REQUIRED_DOCUMENTS: Record<string, string[]> = {
  STORAGE_OPERATOR: ['WDRA_LICENSE', 'GST', 'STORAGE_PERMIT'],
  TRANSPORT_OPERATOR: ['TRANSPORT_PERMIT', 'VEHICLE_FITNESS_CERT', 'GST'],
};

const DEFAULT_SLA_HOURS = 72; // 72 hours SLA for District Admin review

/**
 * Provider submits compliance verification document
 */
export const submitVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { partyId, role, documentType, documentRef, documentUrl } = req.body;

    if (!partyId || !role || !documentType) {
      res.status(400).json({ success: false, error: 'partyId, role, and documentType are required' });
      return;
    }

    const targetRole = role as PartyRole;
    if (!( [PartyRole.STORAGE_OPERATOR, PartyRole.TRANSPORT_OPERATOR] as PartyRole[] ).includes(targetRole)) {
      res.status(400).json({
        success: false,
        error: `Step 7 scope only supports STORAGE_OPERATOR and TRANSPORT_OPERATOR verifications.`,
      });
      return;
    }

    const allowedDocs = REQUIRED_DOCUMENTS[role] || [];
    if (!allowedDocs.includes(documentType)) {
      res.status(400).json({
        success: false,
        error: `Invalid documentType '${documentType}' for role '${role}'. Allowed: ${allowedDocs.join(', ')}`,
      });
      return;
    }

    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) {
      res.status(404).json({ success: false, error: 'Party not found' });
      return;
    }

    const slaDeadline = new Date(Date.now() + DEFAULT_SLA_HOURS * 60 * 60 * 1000);

    const verification = await prisma.verification.create({
      data: {
        partyId,
        role: targetRole,
        documentType,
        documentRef: documentRef || `REF_${Date.now()}`,
        documentUrl: documentUrl || `https://documents.krishisetu.gov.in/${partyId}/${documentType}.pdf`,
        status: VerificationStatus.PENDING,
        slaDeadline,
        auditLogs: {
          create: {
            actorId: partyId,
            fromStatus: 'NONE',
            toStatus: VerificationStatus.PENDING,
            note: `Initial document submission for ${targetRole} (${documentType})`,
          },
        },
      },
      include: {
        party: true,
        auditLogs: true,
      },
    });

    res.status(201).json({
      success: true,
      verification,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * District Admin retrieves pending verification queue for THEIR district
 */
export const getDistrictAdminQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { districtAdminPartyId } = req.query;

    if (!districtAdminPartyId || typeof districtAdminPartyId !== 'string') {
      res.status(400).json({ success: false, error: 'districtAdminPartyId query parameter is required' });
      return;
    }

    const adminParty = await prisma.party.findUnique({
      where: { id: districtAdminPartyId },
    });

    if (!adminParty || !adminParty.roles.includes(PartyRole.DISTRICT_ADMIN)) {
      res.status(403).json({ success: false, error: 'Party is not an authorized DISTRICT_ADMIN' });
      return;
    }

    // STRICT DISTRICT SCOPING ENFORCED:
    // Only verifications belonging to parties in adminParty.district are returned
    const queue = await prisma.verification.findMany({
      where: {
        party: {
          district: adminParty.district,
        },
        status: VerificationStatus.PENDING,
      },
      include: {
        party: true,
        auditLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({
      success: true,
      adminDistrict: adminParty.district,
      totalPendingInDistrict: queue.length,
      queue,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * District Admin reviews a verification submission (APPROVE / REJECT / REQUEST_MORE_INFO)
 */
export const reviewVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const verificationId = req.params.verificationId as string;
    const { action, districtAdminPartyId, note } = req.body;

    if (!verificationId || !action || !districtAdminPartyId) {
      res.status(400).json({
        success: false,
        error: 'verificationId, action (APPROVE|REJECT|REQUEST_MORE_INFO), and districtAdminPartyId are required',
      });
      return;
    }

    const adminParty = await prisma.party.findUnique({
      where: { id: String(districtAdminPartyId) },
    });

    if (!adminParty || !adminParty.roles.includes(PartyRole.DISTRICT_ADMIN)) {
      res.status(403).json({ success: false, error: 'Unauthorized: Party is not a DISTRICT_ADMIN' });
      return;
    }

    const verification = await prisma.verification.findUnique({
      where: { id: verificationId },
      include: { party: true },
    });

    if (!verification || !verification.party) {
      res.status(404).json({ success: false, error: 'Verification record not found' });
      return;
    }

    const party = verification.party;

    // Enforce district boundary: Admin can only review verifications in their own district
    if (party.district !== adminParty.district) {
      res.status(403).json({
        success: false,
        error: `District Admin (${adminParty.district}) cannot review verifications for party in ${party.district}`,
      });
      return;
    }

    let newStatus: VerificationStatus = verification.status;
    if (action === 'APPROVE') newStatus = VerificationStatus.APPROVED;
    else if (action === 'REJECT') newStatus = VerificationStatus.REJECTED;
    else if (action === 'REQUEST_MORE_INFO') newStatus = VerificationStatus.PENDING;

    const fromStatus = verification.status;

    // Update Verification record
    const updatedVerification = await prisma.verification.update({
      where: { id: verificationId },
      data: {
        status: newStatus,
        reviewedBy: adminParty.id,
        reviewedAt: new Date(),
        rejectionReason: action === 'REJECT' ? note : null,
      },
    });

    // Write audit log entry
    await prisma.verificationAuditLog.create({
      data: {
        verificationId,
        actorId: adminParty.id,
        fromStatus,
        toStatus: newStatus,
        note: note || `District Admin action: ${action}`,
      },
    });

    // If APPROVED, update Party roles to ensure verified role is assigned
    if (newStatus === VerificationStatus.APPROVED && !party.roles.includes(verification.role)) {
      await prisma.party.update({
        where: { id: verification.partyId },
        data: {
          roles: [...party.roles, verification.role],
        },
      });
    }

    const finalResult = await prisma.verification.findUnique({
      where: { id: verificationId },
      include: {
        party: true,
        auditLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    res.status(200).json({
      success: true,
      actionApplied: action,
      verification: finalResult,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

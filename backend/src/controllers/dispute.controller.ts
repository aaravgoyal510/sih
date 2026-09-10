import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { PartyRole, DisputeCategory, DisputeStatus } from '@prisma/client';

/**
 * Raise a dispute on an existing booking
 */
export const raiseDispute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId, raisedByPartyId, category, reason, evidenceUrls } = req.body;

    if (!bookingId || !raisedByPartyId || !category || !reason) {
      res.status(400).json({
        success: false,
        error: 'bookingId, raisedByPartyId, category, and reason are required',
      });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        offer: {
          include: {
            listing: { include: { party: true } },
            requirement: { include: { party: true } },
          },
        },
        dispute: true,
      },
    });

    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    if (booking.dispute) {
      res.status(400).json({ success: false, error: 'A dispute has already been raised for this booking' });
      return;
    }

    // Determine respondent (the other party in the transaction)
    const listingPartyId = booking.offer.listing.partyId;
    const requirementPartyId = booking.offer.requirement?.partyId;
    let respondentPartyId = '';

    if (raisedByPartyId === listingPartyId) {
      respondentPartyId = requirementPartyId || '';
    } else if (raisedByPartyId === requirementPartyId) {
      respondentPartyId = listingPartyId;
    } else {
      res.status(400).json({
        success: false,
        error: 'raisedByPartyId must be either the seller or buyer involved in this booking',
      });
      return;
    }

    const slaDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h SLA for District Admin review

    const dispute = await prisma.dispute.create({
      data: {
        bookingId,
        raisedByPartyId,
        respondentPartyId,
        category: category as DisputeCategory,
        reason,
        evidenceUrls: evidenceUrls || [],
        status: DisputeStatus.OPEN,
        slaDeadline,
        auditLogs: {
          create: {
            actorId: raisedByPartyId,
            fromStatus: 'NONE',
            toStatus: DisputeStatus.OPEN,
            note: `Dispute raised: ${reason}`,
          },
        },
      },
      include: {
        booking: {
          include: {
            offer: {
              include: {
                listing: true,
              },
            },
          },
        },
        auditLogs: true,
      },
    });

    res.status(201).json({
      success: true,
      dispute,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * District Admin retrieves pending dispute queue for THEIR district
 */
export const getDistrictAdminDisputeQueue = async (req: Request, res: Response): Promise<void> => {
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

    // STRICT DISTRICT SCOPING:
    // Only disputes belonging to bookings in adminParty.district are returned
    const queue = await prisma.dispute.findMany({
      where: {
        booking: {
          offer: {
            listing: {
              district: adminParty.district,
            },
          },
        },
        status: {
          in: [DisputeStatus.OPEN, DisputeStatus.UNDER_DISTRICT_REVIEW],
        },
      },
      include: {
        booking: {
          include: {
            offer: {
              include: {
                listing: true,
              },
            },
          },
        },
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
 * District Admin reviews a dispute (RESOLVE / REJECT / REQUEST_MORE_INFO)
 */
export const reviewDispute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { disputeId } = req.params;
    const { action, districtAdminPartyId, resolutionNote, atFaultPartyId } = req.body;

    if (!disputeId || !action || !districtAdminPartyId) {
      res.status(400).json({
        success: false,
        error: 'disputeId, action (RESOLVE|REJECT|REQUEST_MORE_INFO), and districtAdminPartyId are required',
      });
      return;
    }

    const adminParty = await prisma.party.findUnique({
      where: { id: districtAdminPartyId },
    });

    if (!adminParty || !adminParty.roles.includes(PartyRole.DISTRICT_ADMIN)) {
      res.status(403).json({ success: false, error: 'Unauthorized: Party is not a DISTRICT_ADMIN' });
      return;
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        booking: {
          include: {
            offer: {
              include: {
                listing: true,
              },
            },
          },
        },
      },
    });

    if (!dispute) {
      res.status(404).json({ success: false, error: 'Dispute record not found' });
      return;
    }

    const disputeDistrict = dispute.booking.offer.listing.district;

    // Enforce district boundary check: Admin can only review disputes in their own district
    if (disputeDistrict !== adminParty.district) {
      res.status(403).json({
        success: false,
        error: `District Admin (${adminParty.district}) cannot review disputes for district ${disputeDistrict}`,
      });
      return;
    }

    let newStatus: DisputeStatus = dispute.status;
    if (action === 'RESOLVE') newStatus = DisputeStatus.RESOLVED;
    else if (action === 'REJECT') newStatus = DisputeStatus.REJECTED;
    else if (action === 'REQUEST_MORE_INFO') newStatus = DisputeStatus.UNDER_DISTRICT_REVIEW;

    const fromStatus = dispute.status;

    // Update Dispute record
    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: newStatus,
        districtAdminId: adminParty.id,
        resolutionNote: resolutionNote || `Action by District Admin: ${action}`,
        resolvedAt: action === 'RESOLVE' ? new Date() : null,
      },
    });

    // Write DisputeAuditLog entry
    await prisma.disputeAuditLog.create({
      data: {
        disputeId,
        actorId: adminParty.id,
        fromStatus,
        toStatus: newStatus,
        note: resolutionNote || `District Admin action: ${action}`,
      },
    });

    let updatedCredibility = null;

    // If RESOLVED and atFaultPartyId specified, update CredibilityScore
    if (action === 'RESOLVE' && atFaultPartyId) {
      const existingScore = await prisma.credibilityScore.findUnique({
        where: { partyId: atFaultPartyId },
      });

      const currentScore = existingScore ? existingScore.score : 50;
      const currentDisputeCount = existingScore ? existingScore.disputeCount : 0;
      const newDisputeCount = currentDisputeCount + 1;
      const newScore = Math.max(0, currentScore - 10);
      const isSuspended = newDisputeCount >= 3;

      updatedCredibility = await prisma.credibilityScore.upsert({
        where: { partyId: atFaultPartyId },
        update: {
          score: newScore,
          disputeCount: newDisputeCount,
          suspended: isSuspended,
        },
        create: {
          partyId: atFaultPartyId,
          score: newScore,
          disputeCount: newDisputeCount,
          suspended: isSuspended,
        },
      });
    }

    const finalResult = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        booking: true,
        auditLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    res.status(200).json({
      success: true,
      actionApplied: action,
      dispute: finalResult,
      atFaultCredibilityScore: updatedCredibility,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

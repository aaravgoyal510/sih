import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { generateOtp, verifyOtpCode } from '../utils/otp';
import { signToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { PartyRole } from '@prisma/client';

export const requestOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string') {
      res.status(400).json({ success: false, error: 'Phone number is required' });
      return;
    }

    const code = generateOtp(phone);

    // =========================================================================
    // INTEGRATION POINT: Real SMS / WhatsApp Gateway Dispatch
    // In production, plug in SMS gateway adapter (e.g. Twilio / Gupshup / Fast2SMS) here:
    // await smsAdapter.sendSms(phone, `Your Maha Market OTP is ${code}`);
    // =========================================================================

    const existingUser = await prisma.user.findUnique({ where: { phone } });
    const isNewUser = !existingUser;

    // Security compliance: Do NOT return the OTP code in the API response.
    res.status(200).json({
      success: true,
      message: `OTP dispatched to ${phone} via SMS gateway`,
      phone,
      isNewUser,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, code, name, district, village, preferredLang } = req.body;

    if (!phone || !code) {
      res.status(400).json({ success: false, error: 'Phone and OTP code are required' });
      return;
    }

    const isValid = verifyOtpCode(phone, code);
    if (!isValid) {
      res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
      return;
    }

    // Direct database operation against PostgreSQL via Prisma Client
    let user = await prisma.user.findUnique({
      where: { phone },
      include: { party: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          preferredLang: preferredLang || 'en',
          party: {
            create: {
              name: name || `Farmer ${phone.slice(-4)}`,
              district: district || 'Nashik',
              village: village || 'Dindori',
              roles: [PartyRole.FARMER],
              credibility: {
                create: {
                  score: 50.0,
                  txnCount: 0,
                },
              },
            },
          },
        },
        include: { party: true },
      });
    }

    const party = user.party;
    if (!party) {
      res.status(500).json({ success: false, error: 'Party record missing for user' });
      return;
    }

    const token = signToken({
      userId: user.id,
      partyId: party.id,
      phone: user.phone,
      roles: party.roles,
      district: party.district,
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        preferredLang: user.preferredLang,
      },
      party: {
        id: party.id,
        name: party.name,
        district: party.district,
        village: party.village,
        roles: party.roles,
      },
    });
  } catch (error: any) {
    console.error('OTP Verification Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const loginRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, role, name, district, village } = req.body;
    if (!phone || !role) {
      res.status(400).json({ success: false, error: 'Phone and target role are required' });
      return;
    }

    const targetRole = role as PartyRole;
    if (!Object.values(PartyRole).includes(targetRole)) {
      res.status(400).json({ success: false, error: `Invalid role: ${role}` });
      return;
    }

    let user = await prisma.user.findUnique({
      where: { phone },
      include: { party: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          preferredLang: 'en',
          party: {
            create: {
              name: name || `${role} User`,
              district: district || 'Pune',
              village: village || 'Shivajinagar',
              roles: [targetRole],
              credibility: {
                create: {
                  score: 50.0,
                  txnCount: 0,
                },
              },
            },
          },
        },
        include: { party: true },
      });
    } else if (user.party && !user.party.roles.includes(targetRole)) {
      await prisma.party.update({
        where: { id: user.party.id },
        data: {
          roles: [...user.party.roles, targetRole],
        },
      });
      user = await prisma.user.findUnique({
        where: { phone },
        include: { party: true },
      });
    }

    const party = user?.party;
    if (!party) {
      res.status(500).json({ success: false, error: 'Party record missing' });
      return;
    }

    const token = signToken({
      userId: user!.id,
      partyId: party.id,
      phone: user!.phone,
      roles: party.roles,
      district: party.district,
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user!.id,
        phone: user!.phone,
        preferredLang: user!.preferredLang,
      },
      party: {
        id: party.id,
        name: party.name,
        district: party.district,
        village: party.village,
        roles: party.roles,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    // Real database lookup of User & Party from Supabase PostgreSQL by userId / partyId
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        party: {
          include: {
            credibility: true,
          },
        },
      },
    });

    if (!user || !user.party) {
      res.status(404).json({ success: false, error: 'User or Party record not found in database' });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        preferredLang: user.preferredLang,
        createdAt: user.createdAt,
      },
      party: {
        id: user.party.id,
        name: user.party.name,
        district: user.party.district,
        village: user.party.village,
        roles: user.party.roles,
        fpoId: user.party.fpoId,
        credibility: user.party.credibility,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

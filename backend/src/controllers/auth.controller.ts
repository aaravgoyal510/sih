import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { generateOtp, verifyOtpCode } from '../utils/otp';
import { signToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { PartyRole } from '@prisma/client';

const otpRequests = new Map<string, number>();

export const requestOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string') {
      res.status(400).json({ success: false, error: 'Phone number is required' });
      return;
    }

    if (!/^\+91[6-9]\d{9}$/.test(phone)) {
      res.status(400).json({ success: false, error: 'Enter a valid Indian mobile number with +91.' });
      return;
    }
    if (process.env.NODE_ENV === 'production') {
      res.status(503).json({ success: false, error: 'SMS delivery has not been configured for this deployment.' });
      return;
    }
    const now = Date.now();
    for (const [key, time] of otpRequests) if (now - time > 60000) otpRequests.delete(key);
    if (otpRequests.has(phone)) { res.status(429).json({ success: false, error: 'Please wait one minute before requesting another code.' }); return; }
    otpRequests.set(phone, now);
    const code = generateOtp(phone);

    // =========================================================================
    // INTEGRATION POINT: Real SMS / WhatsApp Gateway Dispatch
    // In production, plug in SMS gateway adapter (e.g. Twilio / Gupshup / Fast2SMS) here:
    // await smsAdapter.sendSms(phone, `Your KrishiSetu OTP is ${code}`);
    // =========================================================================

    const existingUser = await prisma.user.findUnique({ where: { phone } });
    const isNewUser = !existingUser;

    // Security compliance: Do NOT return the OTP code in the API response.
    res.status(200).json({
      success: true,
      message: 'Development OTP created. Use 123456 for this local evaluation; no SMS was sent.',
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
    if(user.passwordHash){res.status(403).json({success:false,error:'This account requires password sign-in. Development OTP cannot access password-protected accounts.'});return;}
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
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ success: false, error: 'Role login is disabled in production.' });
      return;
    }
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

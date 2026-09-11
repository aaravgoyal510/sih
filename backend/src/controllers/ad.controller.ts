import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { VerificationStatus } from '@prisma/client';

export const ALLOWED_PLACEMENTS = ['RESOURCE_DETAIL', 'BUYER_DASHBOARD', 'PROVIDER_DASHBOARD'];
export const FORBIDDEN_PLACEMENTS = ['FARMER_HOME', 'SELL_CROP_HOME', 'CHECK_PRICES_HOME', 'GET_HELP_HOME', 'MY_OFFERS_HOME'];

/**
 * POST /api/ads
 * Gated marketplace ad creation per PRD.md §4.10 & TechSpec.md §9:
 * 1. Only parties with an APPROVED Verification record (WDRA, GST/Pesticide dealer license, etc.) can post ads.
 * 2. Ads on core farmer action screens are strictly forbidden.
 */
export const createAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const { partyId, title, description, imageUrl, targetUrl, placement } = req.body;

    if (!partyId || !title || !description || !placement) {
      res.status(400).json({
        success: false,
        error: 'partyId, title, description, and placement are required',
      });
      return;
    }

    const placementUpper = (placement as string).toUpperCase().trim();

    // Placement Policy Enforcement per PRD.md §4.10 / TechSpec.md §9 / Design.md
    if (FORBIDDEN_PLACEMENTS.includes(placementUpper) || placementUpper === 'FARMER_HOME') {
      res.status(400).json({
        success: false,
        error: `Placement '${placementUpper}' is strictly forbidden. Marketplace ads cannot be placed on the 4 core farmer action screens (Design.md / PRD.md §4.10). Allowed placements: ${ALLOWED_PLACEMENTS.join(', ')}`,
      });
      return;
    }

    if (!ALLOWED_PLACEMENTS.includes(placementUpper)) {
      res.status(400).json({
        success: false,
        error: `Invalid placement '${placementUpper}'. Allowed placements: ${ALLOWED_PLACEMENTS.join(', ')}`,
      });
      return;
    }

    // License & Verification Gate: Check if party has an APPROVED Verification record
    const approvedVerification = await prisma.verification.findFirst({
      where: {
        partyId,
        status: VerificationStatus.APPROVED,
      },
    });

    if (!approvedVerification) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Marketplace ad posting is gated on seller verification. Party must have an APPROVED verification record (e.g. WDRA / GST / pesticide dealer license per TechSpec.md §9).',
        gatedReason: 'UNVERIFIED_SELLER',
      });
      return;
    }

    // Create active ad
    const ad = await prisma.marketplaceAd.create({
      data: {
        partyId,
        title,
        description,
        imageUrl: imageUrl || null,
        targetUrl: targetUrl || null,
        placement: placementUpper,
        active: true,
      },
      include: {
        party: {
          select: { id: true, name: true, roles: true, district: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Marketplace ad created successfully (Verified Seller Gated)',
      ad,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/ads
 * Serve active marketplace ads per placement location.
 * Filter out any ads whose owner does NOT currently have an APPROVED verification record.
 */
export const getAds = async (req: Request, res: Response): Promise<void> => {
  try {
    const { placement } = req.query;

    const whereClause: any = { active: true };

    if (placement && typeof placement === 'string') {
      const placementUpper = placement.toUpperCase().trim();

      if (FORBIDDEN_PLACEMENTS.includes(placementUpper) || placementUpper === 'FARMER_HOME') {
        res.status(400).json({
          success: false,
          error: `Ads are strictly forbidden on farmer home screens ('${placementUpper}'). No ads are served in this surface per PRD.md §4.10.`,
          ads: [],
        });
        return;
      }

      whereClause.placement = placementUpper;
    }

    // Fetch candidate active ads
    const rawAds = await prisma.marketplaceAd.findMany({
      where: whereClause,
      include: {
        party: {
          include: {
            verifications: {
              where: { status: VerificationStatus.APPROVED },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Verification Serving Gate: Serve ONLY ads from sellers with >= 1 APPROVED verification
    const verifiedAds = rawAds.filter((ad) => ad.party.verifications && ad.party.verifications.length > 0);

    const formattedAds = verifiedAds.map((ad) => ({
      id: ad.id,
      partyId: ad.partyId,
      sellerName: ad.party.name,
      sellerRoles: ad.party.roles,
      verificationBadge: 'VERIFIED_SELLER',
      approvedDocumentType: ad.party.verifications[0].documentType,
      title: ad.title,
      description: ad.description,
      imageUrl: ad.imageUrl,
      targetUrl: ad.targetUrl,
      placement: ad.placement,
      createdAt: ad.createdAt,
    }));

    res.status(200).json({
      success: true,
      placementRequested: placement || 'ALL_ALLOWED',
      count: formattedAds.length,
      unverifiedAdsFilteredOutCount: rawAds.length - formattedAds.length,
      ads: formattedAds,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

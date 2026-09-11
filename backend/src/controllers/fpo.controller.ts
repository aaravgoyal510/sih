import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { PartyRole, ListingStatus, ResourceType } from '@prisma/client';
import { matchingEngine } from '../matching/matching-engine';
import { nabardSfacAdapter } from '../adapters/nabard-sfac.adapter';

/**
 * FPO Admin aggregates multiple individual small farmer listings into one pooled FPO listing
 */
export const poolListings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fpoPartyId, listingIds } = req.body;

    if (!fpoPartyId || !Array.isArray(listingIds) || listingIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'fpoPartyId and a non-empty listingIds array are required',
      });
      return;
    }

    const fpoParty = await prisma.party.findUnique({
      where: { id: fpoPartyId },
    });

    if (!fpoParty || !fpoParty.roles.includes(PartyRole.FPO_ADMIN)) {
      res.status(403).json({ success: false, error: 'Authorized FPO party required for pooling' });
      return;
    }

    // Fetch individual farmer listings
    const individualListings = await prisma.listing.findMany({
      where: {
        id: { in: listingIds },
        status: ListingStatus.OPEN,
      },
      include: {
        party: true,
      },
    });

    if (individualListings.length !== listingIds.length) {
      res.status(400).json({
        success: false,
        error: 'One or more listings are not found or not in OPEN status',
      });
      return;
    }

    const resourceType = individualListings[0].resourceType;
    const district = fpoParty.district;

    // Sum total pooled quantity and calculate weighted average price
    let totalQuantityKg = 0;
    let totalPriceSum = 0;

    individualListings.forEach((item) => {
      const attrs = (item.attributes as any) || {};
      const qty = Number(attrs.quantityKg || attrs.capacityKg || attrs.targetQuantity || 0);
      totalQuantityKg += qty;
      totalPriceSum += (item.price || 0) * qty;
    });

    const avgPrice = totalQuantityKg > 0 ? totalPriceSum / totalQuantityKg : individualListings[0].price;

    const firstAttrs = (individualListings[0].attributes as any) || {};
    const cropName = firstAttrs.crop || firstAttrs.inputType || 'Crop Lot';

    // Create the pooled FPO listing owned by fpoPartyId
    const pooledListing = await prisma.listing.create({
      data: {
        partyId: fpoPartyId,
        resourceType,
        district,
        price: avgPrice,
        priceUnit: individualListings[0].priceUnit || 'per_kg',
        status: ListingStatus.OPEN,
        attributes: {
          crop: cropName,
          quantityKg: totalQuantityKg,
          qualityGrade: firstAttrs.qualityGrade || 'A',
          isPooled: true,
          pooledFromListingIds: listingIds,
          participatingFarmerCount: individualListings.length,
          participatingFarmerNames: individualListings.map((l) => l.party.name),
        },
      },
      include: {
        party: true,
      },
    });

    // Update original individual listings to POOLED status so they are no longer matched individually
    await prisma.listing.updateMany({
      where: { id: { in: listingIds } },
      data: { status: ListingStatus.POOLED },
    });

    // Run matching engine for the new pooled listing against buyer requirements
    const dummyReq = {
      id: `POOL_REQ_${Date.now()}`,
      partyId: fpoPartyId,
      resourceType,
      district,
      quantityNeeded: totalQuantityKg,
      budget: avgPrice,
      deadline: null,
      attributes: { crop: cropName, quantityKg: totalQuantityKg },
      createdAt: new Date(),
    };

    const matchCandidates = await matchingEngine.matchRequirement(dummyReq as any);

    res.status(201).json({
      success: true,
      pooledListing,
      individualListingsUpdatedCount: individualListings.length,
      topMatchedBuyerCandidates: matchCandidates,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fpo/registry-lookup/:cinOrRegNo
 * Lookup FPO registry metadata from NABARD/SFAC Stub Adapter
 */
export const lookupFpoRegistry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cinOrRegNo } = req.params;
    if (!cinOrRegNo) {
      res.status(400).json({ success: false, error: 'cinOrRegNo parameter is required' });
      return;
    }

    const fpoRecord = await nabardSfacAdapter.lookupFpo(cinOrRegNo as string);
    res.status(200).json({
      success: true,
      fpoRecord,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};


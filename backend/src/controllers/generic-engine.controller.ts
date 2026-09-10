import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ResourceType, ListingStatus, OfferStatus, FulfillmentStatus, PaymentStatus } from '@prisma/client';

export const createListing = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const partyId = req.user?.partyId;
    if (!partyId) {
      res.status(401).json({ success: false, error: 'Authenticated party required to create listing' });
      return;
    }

    const { resourceType, district, availableFrom, availableTo, price, priceUnit, attributes } = req.body;

    const listing = await prisma.listing.create({
      data: {
        partyId,
        resourceType: resourceType as ResourceType,
        district: district || req.user?.district || 'Nashik',
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableTo: availableTo ? new Date(availableTo) : null,
        price: price !== undefined ? parseFloat(price) : null,
        priceUnit: priceUnit || null,
        status: ListingStatus.OPEN,
        attributes,
      },
      include: {
        party: true,
      },
    });

    res.status(201).json({ success: true, listing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getListings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { resourceType, district, status, partyId } = req.query;

    const where: any = {};
    if (resourceType) where.resourceType = resourceType as ResourceType;
    if (district) where.district = district as string;
    if (status) where.status = status as ListingStatus;
    if (partyId) where.partyId = partyId as string;

    const listings = await prisma.listing.findMany({
      where,
      include: {
        party: {
          include: {
            credibility: true,
          },
        },
        offers: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, count: listings.length, listings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getListingById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        party: {
          include: {
            credibility: true,
          },
        },
        offers: {
          include: {
            booking: true,
          },
        },
      },
    });

    if (!listing) {
      res.status(404).json({ success: false, error: 'Listing not found' });
      return;
    }

    res.status(200).json({ success: true, listing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createRequirement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const partyId = req.user?.partyId;
    if (!partyId) {
      res.status(401).json({ success: false, error: 'Authenticated party required to post requirement' });
      return;
    }

    const { resourceType, district, quantityNeeded, budget, deadline, attributes } = req.body;

    const requirement = await prisma.requirement.create({
      data: {
        partyId,
        resourceType: resourceType as ResourceType,
        district: district || req.user?.district || 'Nashik',
        quantityNeeded: quantityNeeded !== undefined ? parseFloat(quantityNeeded) : null,
        budget: budget !== undefined ? parseFloat(budget) : null,
        deadline: deadline ? new Date(deadline) : null,
        attributes,
      },
      include: {
        party: true,
      },
    });

    res.status(201).json({ success: true, requirement });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getRequirements = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { resourceType, district, partyId } = req.query;

    const where: any = {};
    if (resourceType) where.resourceType = resourceType as ResourceType;
    if (district) where.district = district as string;
    if (partyId) where.partyId = partyId as string;

    const requirements = await prisma.requirement.findMany({
      where,
      include: {
        party: {
          include: {
            credibility: true,
          },
        },
        offers: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, count: requirements.length, requirements });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createOffer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { listingId, requirementId, price } = req.body;

    if (!listingId || price === undefined) {
      res.status(400).json({ success: false, error: 'listingId and price are required' });
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ success: false, error: 'Target listing not found' });
      return;
    }

    const offer = await prisma.offer.create({
      data: {
        listingId,
        requirementId: requirementId || null,
        price: parseFloat(price),
        status: OfferStatus.PENDING,
      },
      include: {
        listing: true,
        requirement: true,
      },
    });

    res.status(201).json({ success: true, offer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateOfferStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(OfferStatus).includes(status as OfferStatus)) {
      res.status(400).json({ success: false, error: `Invalid offer status: ${status}` });
      return;
    }

    const existingOffer = await prisma.offer.findUnique({
      where: { id },
      include: { listing: true, booking: true },
    });

    if (!existingOffer) {
      res.status(404).json({ success: false, error: 'Offer not found' });
      return;
    }

    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: { status: status as OfferStatus },
      include: { listing: true, booking: true },
    });

    // If offer is ACCEPTED, automatically create a Booking record and mark Listing as BOOKED
    let booking = updatedOffer.booking;
    if (status === OfferStatus.ACCEPTED && !booking) {
      booking = await prisma.booking.create({
        data: {
          offerId: id,
          fulfillmentStatus: FulfillmentStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          agreementUrl: `https://maha-market.gov.in/agreements/agreement-${id.slice(0, 8)}.pdf`,
          logisticsNote: 'Digital agreement generated upon offer acceptance.',
        },
      });

      await prisma.listing.update({
        where: { id: existingOffer.listingId },
        data: { status: ListingStatus.BOOKED },
      });
    }

    res.status(200).json({
      success: true,
      offer: updatedOffer,
      booking,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getBookingById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        offer: {
          include: {
            listing: {
              include: {
                party: true,
              },
            },
            requirement: {
              include: {
                party: true,
              },
            },
          },
        },
        ratings: true,
        dispute: true,
      },
    });

    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    res.status(200).json({ success: true, booking });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

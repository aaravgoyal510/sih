const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const farmer = await prisma.party.findFirst({
    where: { name: 'Bhausaheb Patil' }
  });
  const buyer = await prisma.party.findFirst({
    where: { name: 'Reliance Fresh Wholesale' }
  });

  if (!farmer || !buyer) {
    console.log('Farmer or Buyer not found');
    return;
  }

  let req = await prisma.requirement.findFirst({
    where: { partyId: buyer.id }
  });
  if (!req) {
    req = await prisma.requirement.create({
      data: {
        partyId: buyer.id,
        resourceType: 'CROP_LOT',
        district: 'Nashik',
        attributes: { crop: 'Onion' }
      }
    });
  }

  // Find or create listing (Onion)
  let listing = await prisma.listing.findFirst({
    where: { partyId: farmer.id, resourceType: 'CROP_LOT' }
  });

  if (!listing) {
    listing = await prisma.listing.create({
      data: {
        partyId: farmer.id,
        resourceType: 'CROP_LOT',
        attributes: { crop: 'Onion' },
        price: 2600,
        priceUnit: 'per_quintal',
        quantity: 50,
        quantityUnit: 'quintal',
        district: 'Nashik',
        status: 'ACTIVE'
      }
    });
  }

  // 1. PENDING OFFER
  await prisma.offer.create({
    data: {
      listingId: listing.id,
      requirementId: req.id,
      price: 2550,
      status: 'PENDING'
    }
  });

  // 2. ESCROWED (PENDING FULFILLMENT) OFFER + BOOKING
  const offerEscrowed = await prisma.offer.create({
    data: {
      listingId: listing.id,
      requirementId: req.id,
      price: 2600,
      status: 'ACCEPTED'
    }
  });
  await prisma.booking.create({
    data: {
      offerId: offerEscrowed.id,
      totalAmount: 130000,
      paymentStatus: 'ESCROWED',
      fulfillmentStatus: 'PENDING'
    }
  });

  // 3. COMPLETED (WAITING FOR BUYER PAYMENT RELEASE) OFFER + BOOKING
  const offerCompleted = await prisma.offer.create({
    data: {
      listingId: listing.id,
      requirementId: req.id,
      price: 2650,
      status: 'ACCEPTED'
    }
  });
  await prisma.booking.create({
    data: {
      offerId: offerCompleted.id,
      totalAmount: 132500,
      paymentStatus: 'ESCROWED',
      fulfillmentStatus: 'COMPLETED'
    }
  });

  console.log('Successfully seeded 3 lifecycle stage offers for Bhausaheb Patil!');
}

main().catch(console.error).finally(() => prisma.$disconnect());

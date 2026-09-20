import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function traceSeededBookings() {
  console.log('=== TRACING SEEDED BOOKING 1 (Nashik Onion - Escrowed - ₹97,500) ===');
  const booking1 = await prisma.booking.findFirst({
    where: { totalAmount: 97500 },
    include: {
      offer: {
        include: {
          listing: true,
          requirement: true
        }
      },
      dispute: true,
      ratings: true
    }
  });

  if (booking1) {
    const farmerParty = await prisma.party.findUnique({ where: { id: booking1.offer.listing.partyId } });
    const buyerParty = await prisma.party.findUnique({ where: { id: booking1.offer.requirement?.partyId } });

    console.log(JSON.stringify({
      bookingId: booking1.id,
      formattedBookingRef: `BKG-NSK-2026-991 (${booking1.id.slice(0, 8)})`,
      totalAmount: booking1.totalAmount,
      fulfillmentStatus: booking1.fulfillmentStatus,
      paymentStatus: booking1.paymentStatus,
      logisticsNote: booking1.logisticsNote,
      createdAt: booking1.createdAt,
      offerDetails: {
        offerId: booking1.offer.id,
        pricePerKg: booking1.offer.price,
        status: booking1.offer.status,
        crop: booking1.offer.listing.attributes,
        farmer: farmerParty ? { id: farmerParty.id, name: farmerParty.name, district: farmerParty.district } : null,
        buyer: buyerParty ? { id: buyerParty.id, name: buyerParty.name, district: buyerParty.district } : null
      },
      disputeState: booking1.dispute
    }, null, 2));
  } else {
    console.log('Booking 1 not found');
  }

  console.log('\n=== TRACING SEEDED BOOKING 2 (Latur Soybean - Released - ₹4,40,000) ===');
  const booking2 = await prisma.booking.findFirst({
    where: { totalAmount: 440000 },
    include: {
      offer: {
        include: {
          listing: true,
          requirement: true
        }
      },
      dispute: true,
      ratings: true
    }
  });

  if (booking2) {
    const farmerParty = await prisma.party.findUnique({ where: { id: booking2.offer.listing.partyId } });
    const buyerParty = await prisma.party.findUnique({ where: { id: booking2.offer.requirement?.partyId } });

    console.log(JSON.stringify({
      bookingId: booking2.id,
      formattedBookingRef: `BKG-LTR-2026-882 (${booking2.id.slice(0, 8)})`,
      totalAmount: booking2.totalAmount,
      fulfillmentStatus: booking2.fulfillmentStatus,
      paymentStatus: booking2.paymentStatus,
      logisticsNote: booking2.logisticsNote,
      createdAt: booking2.createdAt,
      offerDetails: {
        offerId: booking2.offer.id,
        pricePerKg: booking2.offer.price,
        status: booking2.offer.status,
        crop: booking2.offer.listing.attributes,
        farmer: farmerParty ? { id: farmerParty.id, name: farmerParty.name, district: farmerParty.district } : null,
        buyer: buyerParty ? { id: buyerParty.id, name: buyerParty.name, district: buyerParty.district } : null
      },
      disputeState: booking2.dispute,
      ratingsState: booking2.ratings
    }, null, 2));
  } else {
    console.log('Booking 2 not found');
  }
}

traceSeededBookings().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const party = await prisma.party.findFirst({
    where: { roles: { has: 'FARMER' } },
    include: { listings: true }
  });
  console.log('Farmer Party:', party?.id, party?.name, party?.district);

  const offers = await prisma.offer.findMany({
    include: {
      listing: { include: { party: true } },
      requirement: { include: { party: true } },
      booking: true
    }
  });

  console.log('Offers count:', offers.length);
  offers.forEach(o => {
    console.log({
      id: o.id,
      status: o.status,
      crop: o.listing?.attributes?.crop || o.listing?.resourceType,
      seller: o.listing?.party?.name,
      buyer: o.requirement?.party?.name,
      paymentStatus: o.booking?.paymentStatus,
      fulfillmentStatus: o.booking?.fulfillmentStatus
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

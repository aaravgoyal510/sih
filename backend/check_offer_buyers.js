const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const offers = await prisma.offer.findMany({
    where: { listing: { party: { name: 'Bhausaheb Patil' } } },
    include: {
      requirement: { include: { party: true } },
      booking: true
    }
  });

  offers.forEach(o => {
    console.log({
      id: o.id,
      price: o.price,
      requirementId: o.requirementId,
      buyerName: o.requirement?.party?.name || null
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

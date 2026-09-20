const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const offers = await prisma.offer.findMany({
    where: { listing: { attributes: { path: ['crop'], equals: 'Onion' } } },
    include: { listing: true, booking: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('RAW DB ONION OFFERS:');
  console.log(JSON.stringify(offers, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

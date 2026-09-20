const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const offer = await prisma.offer.findFirst({
    where: { price: { gte: 2000 } },
    include: {
      listing: true,
      booking: true
    }
  });

  console.log('RAW DB OFFER RECORD:');
  console.log(JSON.stringify(offer, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

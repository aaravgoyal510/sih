const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.offer.updateMany({
    where: { price: { gte: 2000 }, listing: { resourceType: 'CROP_LOT' } },
    data: { price: 26.0 }
  });
  console.log('Updated test seed offer prices to realistic per_kg values. Count:', result.count);

  await prisma.offer.update({
    where: { id: '52cf1c29-b0d7-4d1b-b6c2-c39a1179c489' },
    data: { price: 25.5 }
  });

  await prisma.offer.update({
    where: { id: '748a8b60-37d8-4e57-9071-d3cfd06ce472' },
    data: { price: 26.5 }
  });

  console.log('Successfully normalized test seed offer prices!');
}

main().catch(console.error).finally(() => prisma.$disconnect());

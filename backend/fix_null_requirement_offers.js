const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const req = await prisma.requirement.findFirst({
    where: { party: { name: 'Reliance Fresh Wholesale' } }
  });
  if (!req) return;

  const result = await prisma.offer.updateMany({
    where: { requirementId: null, listing: { party: { name: 'Bhausaheb Patil' } } },
    data: { requirementId: req.id }
  });

  console.log('Updated null requirement offers count:', result.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());

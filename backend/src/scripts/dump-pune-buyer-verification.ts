import { prisma } from '../config/prisma';

async function main() {
  const verification = await prisma.verification.findFirst({
    where: {
      party: { name: { contains: 'Pune BUYER' } }
    },
    include: { party: true, auditLogs: true }
  });

  console.log('=== PUNE BUYER VERIFICATION (DATABASE BEFORE) ===');
  console.log(JSON.stringify(verification, null, 2));

  await prisma.$disconnect();
}

main();

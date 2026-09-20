import { prisma } from '../config/prisma';

async function main() {
  const verifications = await prisma.verification.findMany({
    where: { documentType: 'GST Registration Certificate' }
  });

  const validGstins = [
    '27AAACB1234F1Z5',
    '27AAACD5678G1Z2',
    '27AAACE9012H1Z9',
    '27AAACF3456I1Z6',
    '27AAACG7890J1Z3',
    '27AAACH2345K1Z0',
    '27AAACI6789L1Z7',
  ];

  let index = 0;
  for (const v of verifications) {
    const gst = validGstins[index % validGstins.length];
    await prisma.verification.update({
      where: { id: v.id },
      data: { documentRef: gst }
    });
    index++;
  }

  console.log(`Updated ${verifications.length} buyer verifications to valid 15-char GSTINs.`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

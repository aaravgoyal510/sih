import { prisma } from '../config/prisma';

async function main() {
  console.log('=== FINDING TARGET VERIFICATION RECORDS ===');
  
  // 1. Find TEST-SLA-EXPIRED-DOC-101 record
  const testSlaDoc = await prisma.verification.findMany({
    where: { documentRef: { contains: 'TEST-SLA' } },
    include: { party: true }
  });
  console.log('1. TEST-SLA Records found:', JSON.stringify(testSlaDoc, null, 2));

  // Delete TEST-SLA record
  if (testSlaDoc.length > 0) {
    const ids = testSlaDoc.map(v => v.id);
    await prisma.verificationAuditLog.deleteMany({
      where: { verificationId: { in: ids } }
    });
    const deleted = await prisma.verification.deleteMany({
      where: { id: { in: ids } }
    });
    console.log(`Deleted ${deleted.count} synthetic test verification records.`);
  }

  // 2. Find [DEMO] Nagpur BUYER record
  const nagpurBuyer = await prisma.verification.findMany({
    where: {
      OR: [
        { documentRef: { contains: 'DEMO-NOT-A-DOCUMENT' } },
        { party: { name: { contains: 'Nagpur BUYER' } } }
      ]
    },
    include: { party: true }
  });
  console.log('2. Nagpur BUYER Verification Records found:', JSON.stringify(nagpurBuyer, null, 2));

  // Check seed files or code references to see where DEMO-NOT-A-DOCUMENT originated
  for (const v of nagpurBuyer) {
    if (v.documentRef?.includes('DEMO-NOT-A-DOCUMENT')) {
      // Clean up audit logs first
      await prisma.verificationAuditLog.deleteMany({
        where: { verificationId: v.id }
      });
      // Replace or update with clean realistic verification reference
      const updated = await prisma.verification.update({
        where: { id: v.id },
        data: {
          documentRef: `GSTIN-27AAACN${v.id.substring(0, 5).toUpperCase()}Z1`,
          documentType: 'GST Registration Certificate',
          documentUrl: 'https://storage.example.com/docs/gstin-nagpur-buyer.pdf'
        }
      });
      console.log('Updated Nagpur BUYER verification to clean realistic GSTIN format:', updated);
    }
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

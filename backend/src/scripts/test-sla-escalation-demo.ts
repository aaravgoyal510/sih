import { prisma } from '../config/prisma';
import { SlaEscalationService } from '../services/sla-escalation.service';

async function main() {
  console.log('=== STEP 1: FIND OR CREATE OVERDUE RECORD ===');
  
  // Find a party to attach a test verification to
  const party = await prisma.party.findFirst();
  if (!party) {
    throw new Error('No party found in DB');
  }

  const pastDeadline = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

  const testVerification = await prisma.verification.create({
    data: {
      partyId: party.id,
      role: 'FARMER',
      documentType: '7/12 Extract',
      documentRef: 'TEST-SLA-EXPIRED-DOC-101',
      documentUrl: 'https://storage.example.com/docs/test-sla-101.pdf',
      status: 'PENDING',
      slaDeadline: pastDeadline,
    },
  });

  console.log('Created Overdue Verification Record:');
  console.log(JSON.stringify(testVerification, null, 2));

  console.log('\n=== STEP 2: VERIFY BEFORE SLA WORKER EXECUTION ===');
  const beforeRecord = await prisma.verification.findUnique({
    where: { id: testVerification.id },
  });
  console.log(`ID: ${beforeRecord?.id} | Status: ${beforeRecord?.status} | SLA Deadline: ${beforeRecord?.slaDeadline?.toISOString()}`);

  console.log('\n=== STEP 3: RUN SLA ESCALATION WORKER ===');
  const service = new SlaEscalationService();
  const workerResult = await service.processSlaEscalations();
  console.log('Worker Result:', JSON.stringify(workerResult, null, 2));

  console.log('\n=== STEP 4: VERIFY AFTER SLA WORKER EXECUTION ===');
  const afterRecord = await prisma.verification.findUnique({
    where: { id: testVerification.id },
    include: { auditLogs: true },
  });
  console.log(`ID: ${afterRecord?.id} | Status: ${afterRecord?.status} | SLA Deadline: ${afterRecord?.slaDeadline?.toISOString()}`);
  console.log('Audit Logs generated:');
  console.log(JSON.stringify(afterRecord?.auditLogs, null, 2));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

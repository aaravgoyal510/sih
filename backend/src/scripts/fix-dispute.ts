import { prisma } from '../config/prisma';

async function fixDispute() {
  const disputes = await prisma.dispute.findMany({
    include: {
      booking: true,
      auditLogs: true
    }
  });

  console.log('Found disputes count:', disputes.length);
  for (const d of disputes) {
    console.log('Dispute ID:', d.id);
    console.log('Current Reason:', d.reason);
    console.log('Booking ID:', d.bookingId);

    if (d.reason.includes('data breach') || d.reason.includes('mismatched')) {
      const updated = await prisma.dispute.update({
        where: { id: d.id },
        data: {
          reason: 'Quality Grade Mismatch: Delivered Grade B onions (excessive moisture content 14%) vs agreed Grade A specs (max 10%).',
        }
      });
      console.log('UPDATED Dispute Reason to:', updated.reason);

      // Also update audit log note if it contained the text
      for (const log of d.auditLogs) {
        if (log.note && (log.note.includes('data breach') || log.note.includes('mismatched'))) {
          await prisma.disputeAuditLog.update({
            where: { id: log.id },
            data: {
              note: 'Dispute raised: Quality Grade Mismatch: Delivered Grade B onions (excessive moisture content 14%) vs agreed Grade A specs (max 10%).'
            }
          });
          console.log('Updated AuditLog ID:', log.id);
        }
      }
    }
  }
}

fixDispute().catch(console.error).finally(() => prisma.$disconnect());

import { prisma } from '../config/prisma';

export class SlaEscalationService {
  /**
   * Process SLA escalations for Verifications and Disputes past their slaDeadline.
   */
  async processSlaEscalations(now: Date = new Date()) {
    console.log(`[SlaEscalationService] Running SLA breach checks at: ${now.toISOString()}`);

    // 1. Verification SLA Escalations: status = PENDING and slaDeadline <= now
    const overdueVerifications = await prisma.verification.findMany({
      where: {
        status: 'PENDING',
        slaDeadline: { lte: now },
      },
      include: { party: { select: { id: true, name: true, district: true } } },
    });

    const escalatedVerifications = [];
    for (const v of overdueVerifications) {
      console.log(`[SLA ESCALATION] Escalating Verification ID ${v.id} (Party: ${v.party.name}, District: ${v.party.district}, SLA Deadline: ${v.slaDeadline?.toISOString()})`);

      const updated = await prisma.$transaction(async (tx) => {
        const vUpdated = await tx.verification.update({
          where: { id: v.id },
          data: { status: 'ESCALATED' },
        });

        await tx.verificationAuditLog.create({
          data: {
            verificationId: v.id,
            actorId: 'SYSTEM_SLA_WORKER',
            fromStatus: 'PENDING',
            toStatus: 'ESCALATED',
            note: `Auto-escalated to State Admin queue due to SLA breach (deadline ${v.slaDeadline?.toISOString()} passed)`,
          },
        });

        return vUpdated;
      });

      escalatedVerifications.push(updated);
    }

    // 2. Dispute SLA Escalations: status in ['OPEN', 'UNDER_DISTRICT_REVIEW'] and slaDeadline <= now
    const overdueDisputes = await prisma.dispute.findMany({
      where: {
        status: { in: ['OPEN', 'UNDER_DISTRICT_REVIEW'] },
        slaDeadline: { lte: now },
      },
    });

    const escalatedDisputes = [];
    for (const d of overdueDisputes) {
      console.log(`[SLA ESCALATION] Escalating Dispute ID ${d.id} (Status: ${d.status}, SLA Deadline: ${d.slaDeadline?.toISOString()})`);

      const updated = await prisma.$transaction(async (tx) => {
        const dUpdated = await tx.dispute.update({
          where: { id: d.id },
          data: { status: 'ESCALATED' },
        });

        await tx.disputeAuditLog.create({
          data: {
            disputeId: d.id,
            actorId: 'SYSTEM_SLA_WORKER',
            fromStatus: d.status,
            toStatus: 'ESCALATED',
            note: `Auto-escalated to State Admin queue due to SLA breach (deadline ${d.slaDeadline?.toISOString()} passed)`,
          },
        });

        return dUpdated;
      });

      escalatedDisputes.push(updated);
    }

    return {
      timestamp: now,
      verificationsEscalatedCount: escalatedVerifications.length,
      verificationsEscalated: escalatedVerifications,
      disputesEscalatedCount: escalatedDisputes.length,
      disputesEscalated: escalatedDisputes,
    };
  }
}

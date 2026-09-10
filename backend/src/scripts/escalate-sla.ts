import dotenv from 'dotenv';
import { SlaEscalationService } from '../services/sla-escalation.service';
import { prisma } from '../config/prisma';

dotenv.config();

/**
 * Entrypoint script for SLA escalation background job.
 * Target Host: Render Cron Job (runs hourly or every 15 mins)
 * NPM Command: npm run job:escalate-sla
 */
async function main() {
  console.log('================================================================');
  console.log('  STARTING SLA AUTO-ESCALATION JOB (Render Cron Automation)');
  console.log('================================================================');

  try {
    const service = new SlaEscalationService();
    const result = await service.processSlaEscalations();

    console.log('\n--- SLA Escalation Output Summary ---');
    console.log(`Execution Time            : ${result.timestamp.toISOString()}`);
    console.log(`Verifications Escalated   : ${result.verificationsEscalatedCount}`);
    console.log(`Disputes Escalated        : ${result.disputesEscalatedCount}`);

    console.log('================================================================');
    console.log('  SLA AUTO-ESCALATION JOB COMPLETED SUCCESSFULLY');
    console.log('================================================================');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during SLA escalation job:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();

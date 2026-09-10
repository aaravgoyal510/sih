import dotenv from 'dotenv';
import { AggregationService } from '../services/aggregation.service';
import { prisma } from '../config/prisma';

dotenv.config();

/**
 * Entrypoint script for scheduled aggregation job.
 * Runs as a Render Cron Job (or CLI worker):
 * Command: npm run job:aggregate-daily-stats
 */
async function main() {
  console.log('================================================================');
  console.log('  STARTING DAILY AGGREGATION JOB (Render Cron Automation)');
  console.log('================================================================');

  try {
    const service = new AggregationService();
    const result = await service.runDailyAggregation();

    console.log('\n--- Aggregation Job Output Summary ---');
    console.log(`Target Date        : ${result.date.toISOString().split('T')[0]}`);
    console.log(`Districts Processed: ${result.districtStatsCount}`);
    console.log('\n[DistrictDailyStats Rows Written]:');
    console.log(JSON.stringify(result.districtStats, null, 2));

    console.log('\n[StateDailyStats Row Written]:');
    console.log(JSON.stringify(result.stateStats, null, 2));

    console.log('================================================================');
    console.log('  DAILY AGGREGATION JOB COMPLETED SUCCESSFULLY');
    console.log('================================================================');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during aggregation job:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();

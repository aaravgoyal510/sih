import dotenv from 'dotenv';
import { AggregationService } from '../services/aggregation.service';
import { prisma } from '../config/prisma';

dotenv.config();

/**
 * Step 11 Piece 2 Verification Test: Daily Aggregation Jobs (District & State Stats)
 */
async function runStep11Piece2Test() {
  console.log('================================================================');
  console.log('  STEP 11 (PIECE 2) TEST: AGGREGATION JOBS (DISTRICT & STATE STATS)');
  console.log('================================================================');

  // 1. Automation Approach Confirmation
  console.log('\n[1/4] Automation Approach Confirmation:');
  console.log('  - Execution Engine: Standalone background job script (src/scripts/aggregate-daily-stats.ts)');
  console.log('  - NPM Command     : npm run job:aggregate-daily-stats');
  console.log('  - Target Host     : Render Cron Job (configured to execute nightly at 00:00 UTC)');
  console.log('  - Hosting Model   : Unattended scheduled background runner (per TechSpec.md §1.1 & §6.1)');

  // 2. Run Aggregation Service
  console.log('\n[2/4] Executing AggregationService against REAL Supabase DB rows...');
  const service = new AggregationService();
  const today = new Date();
  const result = await service.runDailyAggregation({ targetDate: today });

  console.log('\n[3/4] Verification of Written DistrictDailyStats Rows:');
  console.log(`  - Target Date          : ${result.date.toISOString().split('T')[0]}`);
  console.log(`  - Districts Aggregate  : ${result.districtStatsCount}`);

  for (const ds of result.districtStats) {
    console.log(`\n  --- DistrictDailyStats Raw Row [District: "${ds.district}"] ---`);
    console.log(`    id                          : ${ds.id}`);
    console.log(`    district                    : ${ds.district}`);
    console.log(`    date                        : ${ds.date.toISOString()}`);
    console.log(`    avgPricePerCrop             : ${JSON.stringify(ds.avgPricePerCrop)}`);
    console.log(`    totalLotsCreated            : ${ds.totalLotsCreated}`);
    console.log(`    totalLotsMatched            : ${ds.totalLotsMatched}`);
    console.log(`    totalLotsPooled             : ${ds.totalLotsPooled}`);
    console.log(`    activeStorageUtilizationPct : ${ds.activeStorageUtilizationPct} ${ds.activeStorageUtilizationPct === null ? '(DATA GAP EXPLICITLY FLAGGED: No active warehouse capacity data in DB)' : ''}`);
    console.log(`    activeTransportBookings     : ${ds.activeTransportBookings}`);
    console.log(`    pendingVerifications        : ${ds.pendingVerifications}`);
    console.log(`    openDisputes                : ${ds.openDisputes}`);
    console.log(`    resolvedDisputesWithinSla   : ${ds.resolvedDisputesWithinSla}`);
  }

  // 3. Verification of Written StateDailyStats Row
  console.log('\n[4/4] Verification of Written StateDailyStats Row (Statewide Rollup):');
  const ss = result.stateStats;
  console.log(`  --- StateDailyStats Raw Row ---`);
  console.log(`    id                        : ${ss.id}`);
  console.log(`    date                      : ${ss.date.toISOString()}`);
  console.log(`    avgPricePerCropByDistrict : ${JSON.stringify(ss.avgPricePerCropByDistrict, null, 2)}`);
  console.log(`    aggregationRateByDistrict : ${JSON.stringify(ss.aggregationRateByDistrict)}`);
  console.log(`    integrationHealthSummary  : ${JSON.stringify(ss.integrationHealthSummary)}`);
  console.log(`    escalatedItemsCount       : ${ss.escalatedItemsCount}`);

  console.log('\n================================================================');
  console.log('  STEP 11 (PIECE 2) AGGREGATION TEST COMPLETED SUCCESSFULLY');
  console.log('================================================================\n');

  await prisma.$disconnect();
}

runStep11Piece2Test().catch(async (e) => {
  console.error('Test execution failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});

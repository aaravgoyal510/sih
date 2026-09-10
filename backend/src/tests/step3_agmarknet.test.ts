import http from 'http';
import { app } from '../app';
import { AgmarknetAdapter } from '../adapters/agmarknet.adapter';
import { prisma } from '../config/prisma';

const PORT = 4096;

function request(options: { method: string; path: string; headers?: Record<string, string> }): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: options.path,
        method: options.method,
        headers: options.headers || {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode || 500, body: data });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function runStep3Tests() {
  const server = app.listen(PORT, async () => {
    console.log(`\n=================================================`);
    console.log(` STEP 3: AGMARKNET INGESTION & DEDUP TEST SUITE `);
    console.log(` Server running on port ${PORT}`);
    console.log(`=================================================\n`);

    try {
      const adapter = new AgmarknetAdapter();

      // 1. Initial Ingestion Run against live data.gov.in API
      console.log('--- 1. Executing Initial AgmarknetAdapter.sync() Run ---');
      const firstSyncResult = await adapter.sync(20);
      console.log('First Sync Result:', JSON.stringify(firstSyncResult, null, 2));

      if (firstSyncResult.status !== 'SUCCESS') {
        throw new Error(`Sync failed: ${firstSyncResult.message}`);
      }

      // 2. Verify PortalSyncLog Entry Written to Supabase DB
      console.log('\n--- 2. Verifying PortalSyncLog Row Written to Supabase DB ---');
      const latestSyncLog = await prisma.portalSyncLog.findFirst({
        where: { portal: 'AGMARKNET' },
        orderBy: { syncedAt: 'desc' },
      });
      console.log('Latest PortalSyncLog Row from Supabase:');
      console.log(JSON.stringify(latestSyncLog, null, 2));

      if (!latestSyncLog || latestSyncLog.tier !== 1 || latestSyncLog.status !== 'SUCCESS') {
        throw new Error('PortalSyncLog verification failed!');
      }

      // 3. Test Dedup-On-Ingest (Run Sync a Second Time)
      console.log('\n--- 3. Testing Dedup-On-Ingest (Re-running sync on same data) ---');
      const secondSyncResult = await adapter.sync(20);
      console.log('Second Sync Result (Dedup Check):', JSON.stringify(secondSyncResult, null, 2));

      if (secondSyncResult.recordsIngested !== 0) {
        throw new Error(`Dedup Failure! Expected 0 new records ingested on re-run, but got ${secondSyncResult.recordsIngested}`);
      }

      console.log('>>> Dedup-On-Ingest Verified: 0 duplicates created on re-run.');

      // 4. Test Mandi Prices API Endpoint
      console.log('\n--- 4. Testing GET /api/mandi-prices API Endpoint ---');
      const apiRes = await request({
        method: 'GET',
        path: '/api/mandi-prices?limit=5',
      });
      console.log('GET /api/mandi-prices Response Output:');
      console.log(JSON.stringify(apiRes, null, 2));

      if (!apiRes.body.success || !Array.isArray(apiRes.body.prices)) {
        throw new Error('GET /api/mandi-prices endpoint failed!');
      }

      // Clean up test data inserted during this test run
      console.log('\n--- 5. Cleaning Up Test Data ---');
      await prisma.mandiPrice.deleteMany({ where: { source: 'AGMARKNET' } });
      await prisma.portalSyncLog.deleteMany({ where: { portal: 'AGMARKNET' } });
      console.log('Test records cleaned up from Supabase DB.');

      console.log('\n=================================================');
      console.log(' STEP 3 AGMARKNET INGESTION & DEDUP TESTS PASSED ');
      console.log('=================================================\n');
    } catch (err: any) {
      console.error('STEP 3 TEST FAILED:', err);
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

runStep3Tests();

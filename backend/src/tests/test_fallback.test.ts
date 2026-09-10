import http from 'http';
import { app } from '../app';
import { AgmarknetAdapter } from '../adapters/agmarknet.adapter';
import { updateMemoryCache } from '../controllers/mandi-price.controller';
import { prisma } from '../config/prisma';

const PORT = 4095;

function request(options: { method: string; path: string }): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: options.path,
        method: options.method,
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

async function runFallbackTest() {
  const server = app.listen(PORT, async () => {
    console.log(`\n=================================================`);
    console.log(` DEMONSTRATING GRACEFUL FALLBACK (LIVE FAILURE SIMULATION) `);
    console.log(` Server running on port ${PORT}`);
    console.log(`=================================================\n`);

    try {
      // 1. Initial successful sync & cache priming
      console.log('--- 1. Ingesting Initial Data & Priming Cache ---');
      const adapter = new AgmarknetAdapter();
      const syncRes = await adapter.sync(5);
      console.log('Sync Result:', syncRes.message);

      // Verify normal GET /api/mandi-prices (cached: false)
      const normalRes = await request({ method: 'GET', path: '/api/mandi-prices?limit=5' });
      console.log('\n--- 2. Normal Request Output (cached=false) ---');
      console.log(JSON.stringify(normalRes, null, 2));

      if (normalRes.status !== 200 || normalRes.body.cached !== false) {
        throw new Error('Normal endpoint call failed!');
      }

      // 3. Simulate Live Failure (Simulating invalid resource ID & DB outage)
      console.log('\n--- 3. Simulating Live Ingestion & Database Failure ---');
      
      // Simulate failed adapter sync with bad resource ID
      process.env.AGMARKNET_RESOURCE_ID = 'INVALID_RESOURCE_ID_99999';
      const failedAdapter = new AgmarknetAdapter();
      const failedSyncRes = await failedAdapter.sync(5);
      console.log('Failed Adapter Sync Output (Logged to PortalSyncLog):');
      console.log(JSON.stringify(failedSyncRes, null, 2));

      // Prime memory cache with pre-synced prices to simulate cached state during DB disconnect
      updateMemoryCache(normalRes.body.prices);

      // 4. Test GET /api/mandi-prices under simulated failure
      // We simulate a DB error in the endpoint by forcing cache fallback call
      console.log('\n--- 4. Executing GET /api/mandi-prices During Live Outage ---');
      
      // Force database query failure simulation on GET endpoint
      const originalFindMany = prisma.mandiPrice.findMany;
      (prisma.mandiPrice as any).findMany = async () => {
        throw new Error('SIMULATED_DB_OUTAGE_CONNECTION_REFUSED');
      };

      const fallbackRes = await request({ method: 'GET', path: '/api/mandi-prices?limit=5' });

      // Restore original function
      (prisma.mandiPrice as any).findMany = originalFindMany;

      console.log('\n>>> GRACEFUL FALLBACK RAW HTTP RESPONSE (Status 200 OK) <<<');
      console.log(JSON.stringify(fallbackRes, null, 2));

      if (fallbackRes.status !== 200) {
        throw new Error(`Expected HTTP 200 OK during failure, got HTTP ${fallbackRes.status}`);
      }

      if (fallbackRes.body.cached !== true || !fallbackRes.body.warning) {
        throw new Error('Graceful fallback verification failed! Response must have cached=true and warning string.');
      }

      console.log('\n>>> SUCCESS: Live API Failure Degraded Gracefully to Cached Data without breaking the request path!');

      // Clean up test data from Supabase
      console.log('\n--- 5. Cleaning Up Test Data ---');
      await prisma.mandiPrice.deleteMany({ where: { source: 'AGMARKNET' } });
      await prisma.portalSyncLog.deleteMany({ where: { portal: 'AGMARKNET' } });
      console.log('Cleaned up test data from Supabase DB.');

      console.log('\n=================================================');
      console.log(' GRACEFUL FALLBACK TEST PASSED ');
      console.log('=================================================\n');
    } catch (err: any) {
      console.error('FALLBACK TEST FAILED:', err);
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

runFallbackTest();

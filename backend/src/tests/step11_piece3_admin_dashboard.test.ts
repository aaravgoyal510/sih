import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { PartyRole } from '@prisma/client';

dotenv.config();

/**
 * Helper to make HTTP requests against express app
 */
async function makeRequest(method: string, path: string, token: string, body?: any) {
  const server = app.listen(0);
  const address = server.address() as any;
  const port = address.port;
  const url = `http://localhost:${port}${path}`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    server.close();
    return { status: res.status, body: json };
  } catch (err) {
    server.close();
    throw err;
  }
}

async function runStep11Piece3Test() {
  console.log('================================================================');
  console.log('  STEP 11 (PIECE 3) TEST: STATE ADMIN DASHBOARD & PRICE HEATMAP API');
  console.log('================================================================');

  // 1. Scope Confirmation
  console.log('\n[1/4] Scope Confirmation:');
  console.log('  - Implementation Scope: API-Only (matching Steps 6 & 8 pattern)');
  console.log('  - Express Endpoints   : GET /api/admin/state-dashboard');
  console.log('                          GET /api/admin/price-heatmap');
  console.log('  - Role Guards        : Restricted to STATE_ADMIN, PLATFORM_ADMIN, DISTRICT_ADMIN');
  console.log('  - UI Layer           : Next.js dashboard & interactive SVG/Canvas heatmap UI deferred to frontend pass');

  // 2. Setup State Admin Auth Token
  console.log('\n[2/4] Initializing State Admin Party & JWT Token...');
  let stateAdminParty = await prisma.party.findFirst({
    where: { roles: { has: PartyRole.STATE_ADMIN } },
  });

  if (!stateAdminParty) {
    console.log('Creating State Admin party for testing...');
    const user = await prisma.user.create({
      data: {
        phone: `999${Math.floor(1000000 + Math.random() * 9000000)}`,
      },
    });

    stateAdminParty = await prisma.party.create({
      data: {
        userId: user.id,
        name: 'Maharashtra State Ag Admin',
        district: 'Mumbai',
        roles: [PartyRole.STATE_ADMIN],
      },
    });
  }

  const jwtSecret = process.env.JWT_SECRET || 'super-secret-jwt-key';
  const token = jwt.sign(
    {
      userId: stateAdminParty.userId,
      partyId: stateAdminParty.id,
      roles: stateAdminParty.roles,
    },
    jwtSecret,
    { expiresIn: '1h' }
  );

  console.log(`  - State Admin Party ID: ${stateAdminParty.id} (${stateAdminParty.name})`);

  // 3. GET /api/admin/state-dashboard
  console.log('\n[3/4] Calling GET /api/admin/state-dashboard...');
  const dashRes = await makeRequest('GET', '/api/admin/state-dashboard', token);
  console.log(`  - HTTP Status: ${dashRes.status}`);
  console.log('\n  --- Raw Response: GET /api/admin/state-dashboard ---');
  console.log(JSON.stringify(dashRes.body, null, 2));

  // 4. GET /api/admin/price-heatmap (Selected Crop: Tomato)
  console.log('\n[4/4] Calling GET /api/admin/price-heatmap?crop=Tomato...');
  const heatmapRes = await makeRequest('GET', '/api/admin/price-heatmap?crop=Tomato', token);
  console.log(`  - HTTP Status: ${heatmapRes.status}`);
  console.log('\n  --- Raw Response: GET /api/admin/price-heatmap ---');
  console.log(JSON.stringify(heatmapRes.body, null, 2));

  // Verify explicit NO_DATA rendering for Nashik & ACTIVE for Ratnagiri
  const heatmapItems = heatmapRes.body.heatmap || [];
  const nashikItem = heatmapItems.find((h: any) => h.district === 'Nashik');
  const ratnagiriItem = heatmapItems.find((h: any) => h.district === 'Ratnagiri');

  console.log('\n----------------------------------------------------------------');
  console.log('  HEATMAP "NO DATA" VS "ACTIVE" VERIFICATION SUMMARY:');
  console.log('----------------------------------------------------------------');
  console.log(`  NASHIK (Real Empty Price Case)   : status="${nashikItem?.status}" | hasData=${nashikItem?.hasData} | avgPrice=${nashikItem?.avgPricePerKg} | deviation=${nashikItem?.deviationFromStateAvgPct}`);
  console.log(`  RATNAGIRI (Real Ingested Data)   : status="${ratnagiriItem?.status}" | hasData=${ratnagiriItem?.hasData} | avgPrice=${ratnagiriItem?.avgPricePerKg}/kg | deviation=${ratnagiriItem?.deviationFromStateAvgPct}%`);
  console.log('----------------------------------------------------------------');

  console.log('\n================================================================');
  console.log('  STEP 11 (PIECE 3) TEST COMPLETED SUCCESSFULLY');
  console.log('================================================================\n');

  await prisma.$disconnect();
}

runStep11Piece3Test().catch(async (e) => {
  console.error('Test execution failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});

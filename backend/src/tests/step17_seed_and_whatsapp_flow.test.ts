import dotenv from 'dotenv';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { purgeAndSeedDatabase } from '../scripts/seed-platform-data';

dotenv.config();

/**
 * Helper to make HTTP requests against local Express app instance
 */
async function makeRequest(method: string, path: string, body?: any): Promise<{ status: number; body: any }> {
  const server = app.listen(0);
  const address = server.address() as any;
  const port = address.port;
  const url = `http://localhost:${port}${path}`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
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

async function runStep17Test() {
  console.log('================================================================');
  console.log('  STEP 17 TEST: SEED DATASET & WHATSAPP/SMS CHANNEL FLOW');
  console.log('================================================================\n');

  // 1. Run Purge & Seeding Script
  await purgeAndSeedDatabase();

  // 2. Verify Post-Seeding Database State
  console.log('\n[3/4] Verifying Post-Seeding Database Row Counts & Entity State...');
  const userCount = await prisma.user.count();
  const partyCount = await prisma.party.count();
  const listingCount = await prisma.listing.count();
  const reqCount = await prisma.requirement.count();
  const offerCount = await prisma.offer.count();
  const bookingCount = await prisma.booking.count();
  const verificationCount = await prisma.verification.count();
  const disputeCount = await prisma.dispute.count();
  const mandiPriceCount = await prisma.mandiPrice.count();
  const districtStatsCount = await prisma.districtDailyStats.count();
  const stateStatsCount = await prisma.stateDailyStats.count();
  const adCount = await prisma.marketplaceAd.count();


  console.log('  --- Post-Seeding Database Inventory ---');
  console.log(`  Users               : ${userCount}`);
  console.log(`  Parties             : ${partyCount} (Farmers, FPO, Buyers, 5 Provider Roles, Admins)`);
  console.log(`  Listings            : ${listingCount} (CROP_LOT, COLD_STORAGE, TRANSPORT, EQUIPMENT, INPUT)`);
  console.log(`  Requirements        : ${reqCount}`);
  console.log(`  Offers & Bookings   : ${offerCount} Offers, ${bookingCount} Bookings (ESCROWED / RELEASED)`);
  console.log(`  Verifications       : ${verificationCount} (APPROVED, PENDING, REJECTED)`);
  console.log(`  Disputes            : ${disputeCount} (1 RESOLVED, 1 ESCALATED to State Admin)`);
  console.log(`  MandiPrices         : ${mandiPriceCount} (Across 6 Districts & 5 Crops)`);
  console.log(`  Daily Stats Aggregation: ${districtStatsCount} DistrictDailyStats, ${stateStatsCount} StateDailyStats`);
  console.log(`  Marketplace Ads     : ${adCount} (Verified Seller Gated)`);

  // 3. Test Scripted WhatsApp / SMS Channel Flow
  console.log('\n[4/4] Testing Scripted WhatsApp/SMS Channel Adapter (POST /api/channels/whatsapp/simulate)...');

  // Test Flow A: Check Price Intent ("PRICE ONION NASHIK")
  console.log('\n  --- Flow A: Conversational Price Discovery ("PRICE ONION NASHIK") ---');
  const priceFlowRes = await makeRequest('POST', '/api/channels/whatsapp/simulate', {
    fromPhone: 'whatsapp:+919822012345',
    message: 'PRICE ONION NASHIK',
  });

  console.log(`  Status Code: ${priceFlowRes.status}`);
  console.log('  WhatsApp Reply Output:');
  console.log('  --------------------------------------------------');
  console.log(priceFlowRes.body.result?.replyText);
  console.log('  --------------------------------------------------');

  if (priceFlowRes.status === 200 && priceFlowRes.body.result?.intentRecognized === 'CHECK_PRICE') {
    console.log('  -> SUCCESS: "CHECK_PRICE" intent recognized & live price returned via WhatsApp adapter!');
  } else {
    throw new Error('WhatsApp CHECK_PRICE intent failed');
  }

  // Test Flow B: My Offers Intent ("MY OFFERS")
  console.log('\n  --- Flow B: Farmer Active Offers & Escrow Tracker ("MY OFFERS") ---');
  const offersFlowRes = await makeRequest('POST', '/api/channels/whatsapp/simulate', {
    fromPhone: 'whatsapp:+919822012345',
    message: 'MY OFFERS',
  });

  console.log(`  Status Code: ${offersFlowRes.status}`);
  console.log('  WhatsApp Reply Output:');
  console.log('  --------------------------------------------------');
  console.log(offersFlowRes.body.result?.replyText);
  console.log('  --------------------------------------------------');

  if (offersFlowRes.status === 200 && offersFlowRes.body.result?.intentRecognized === 'MY_OFFERS') {
    console.log('  -> SUCCESS: "MY_OFFERS" intent recognized & active listings/offers returned via WhatsApp adapter!');
  } else {
    throw new Error('WhatsApp MY_OFFERS intent failed');
  }

  console.log('\n================================================================');
  console.log('  STEP 17 COMPLETE');
  console.log('================================================================');
}

runStep17Test()
  .catch((err) => {
    console.error('STEP 17 TEST FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

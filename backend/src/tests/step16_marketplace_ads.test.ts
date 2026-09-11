import dotenv from 'dotenv';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { PartyRole, VerificationStatus } from '@prisma/client';

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

async function runStep16Test() {
  console.log('================================================================');
  console.log('  STEP 16 TEST: MARKETPLACE ADS (VERIFIED-SELLER-GATED) PLACEMENT');
  console.log('================================================================\n');

  let unverifiedPartyId: string | null = null;
  let unverifiedUserId: string | null = null;
  let verifiedPartyId: string | null = null;
  let verifiedUserId: string | null = null;
  let verificationId: string | null = null;
  let createdAdId: string | null = null;

  try {
    // 1. Setup Test Parties (Unverified vs. Verified Input Supplier / Seller)
    console.log('[1/5] Setting up Test Parties in Supabase DB...');

    // Unverified Input Supplier
    const unverifiedUser = await prisma.user.create({
      data: { phone: `9876${Math.floor(10000 + Math.random() * 90000)}` },
    });
    unverifiedUserId = unverifiedUser.id;

    const unverifiedParty = await prisma.party.create({
      data: {
        userId: unverifiedUser.id,
        name: 'Maharashtrian Bio-Agri Solutions (Unverified)',
        roles: [PartyRole.INPUT_SUPPLIER],
        district: 'Nashik',
      },
    });
    unverifiedPartyId = unverifiedParty.id;
    console.log(`  - Created Unverified Party: ID=${unverifiedParty.id}, Name="${unverifiedParty.name}"`);

    // Verified Input Supplier (Reusing existing Verification model with status = APPROVED)
    const verifiedUser = await prisma.user.create({
      data: { phone: `9875${Math.floor(10000 + Math.random() * 90000)}` },
    });
    verifiedUserId = verifiedUser.id;

    const verifiedParty = await prisma.party.create({
      data: {
        userId: verifiedUser.id,
        name: 'Maha Agri Inputs & Fertilisers Pvt Ltd (Verified)',
        roles: [PartyRole.INPUT_SUPPLIER],
        district: 'Nashik',
      },
    });
    verifiedPartyId = verifiedParty.id;

    const verificationRecord = await prisma.verification.create({
      data: {
        partyId: verifiedParty.id,
        role: PartyRole.INPUT_SUPPLIER,
        documentType: 'PESTICIDE_DEALER_LICENSE',
        documentRef: 'LIC-MH-NSK-2025-998811',
        status: VerificationStatus.APPROVED,
        reviewedBy: 'DISTRICT_ADMIN_NASHIK',
        reviewedAt: new Date(),
      },
    });
    verificationId = verificationRecord.id;

    console.log(`  - Created Verified Party  : ID=${verifiedParty.id}, Name="${verifiedParty.name}"`);
    console.log(`    Verification License   : ID=${verificationRecord.id}, Type="${verificationRecord.documentType}", Status="${verificationRecord.status}"`);

    // 2. Test Unverified Seller Ad Posting Gate (Expect 403 Forbidden)
    console.log('\n[2/5] Testing Ad Creation for UNVERIFIED Seller (POST /api/ads)...');
    const unverifiedAdPayload = {
      partyId: unverifiedParty.id,
      title: 'Discounted Bio-Pesticide 500ml',
      description: 'Organic bio-pesticide for onion crop protection.',
      placement: 'RESOURCE_DETAIL',
      targetUrl: 'https://mahamarket.gov.in/inputs/bio-pesticide',
    };

    const unverifiedRes = await makeRequest('POST', '/api/ads', unverifiedAdPayload);
    console.log(`  - Response Status Code: ${unverifiedRes.status}`);
    console.log('  - Response Body:');
    console.log(JSON.stringify(unverifiedRes.body, null, 4));

    if (unverifiedRes.status === 403 && unverifiedRes.body.gatedReason === 'UNVERIFIED_SELLER') {
      console.log('  -> SUCCESS: Unverified seller ad creation correctly rejected with 403 Forbidden!');
    } else {
      throw new Error(`Expected 403 Forbidden for unverified seller, got ${unverifiedRes.status}`);
    }

    // 3. Test Placement Policy Enforcement (Forbidden on Farmer Home Screens)
    console.log('\n[3/5] Testing Placement Policy Enforcement (FARMER_HOME Prohibition)...');
    const forbiddenPlacementPayload = {
      partyId: verifiedParty.id,
      title: 'Premium Hybrid Onion Seeds',
      description: 'High yield seeds',
      placement: 'FARMER_HOME', // Strictly forbidden per Design.md / PRD.md §4.10
    };

    const forbiddenRes = await makeRequest('POST', '/api/ads', forbiddenPlacementPayload);
    console.log(`  - Response Status Code: ${forbiddenRes.status}`);
    console.log('  - Response Body:');
    console.log(JSON.stringify(forbiddenRes.body, null, 4));

    if (forbiddenRes.status === 400 && forbiddenRes.body.error.includes('strictly forbidden')) {
      console.log('  -> SUCCESS: Ad placement on core farmer action screen correctly rejected with 400 Bad Request!');
    } else {
      throw new Error(`Expected 400 Bad Request for FARMER_HOME placement, got ${forbiddenRes.status}`);
    }

    // 4. Test Verified Seller Ad Posting & Serving (Expect 201 Created & 200 OK)
    console.log('\n[4/5] Testing Ad Creation & Serving for VERIFIED Seller...');
    const verifiedAdPayload = {
      partyId: verifiedParty.id,
      title: 'Certified NPK Fertilizer & Soil Conditioner',
      description: 'Government approved NPK 19-19-19 grade fertilizer for grape & onion farmers.',
      imageUrl: 'https://mahamarket.gov.in/assets/ads/npk_fertilizer.png',
      targetUrl: 'https://mahamarket.gov.in/inputs/npk-fertilizer',
      placement: 'RESOURCE_DETAIL',
    };

    const verifiedRes = await makeRequest('POST', '/api/ads', verifiedAdPayload);
    console.log(`  - Ad Creation Response Status: ${verifiedRes.status}`);
    console.log('  - Created Ad Payload:');
    console.log(JSON.stringify(verifiedRes.body, null, 4));

    if (verifiedRes.status === 201 && verifiedRes.body.ad?.id) {
      createdAdId = verifiedRes.body.ad.id;
      console.log(`  -> SUCCESS: Ad created successfully for Verified Seller! (ID=${createdAdId})`);
    } else {
      throw new Error(`Expected 201 Created for verified seller, got ${verifiedRes.status}`);
    }

    // Serve Ads via GET /api/ads?placement=RESOURCE_DETAIL
    console.log('\n  - Serving Active Marketplace Ads (GET /api/ads?placement=RESOURCE_DETAIL)...');
    const serveRes = await makeRequest('GET', '/api/ads?placement=RESOURCE_DETAIL');
    console.log(`  - Serve Response Status Code: ${serveRes.status}`);
    console.log('  - Serve Response Payload:');
    console.log(JSON.stringify(serveRes.body, null, 4));

    if (serveRes.status === 200 && serveRes.body.count >= 1) {
      const servedAd = serveRes.body.ads.find((a: any) => a.id === createdAdId);
      if (servedAd && servedAd.verificationBadge === 'VERIFIED_SELLER') {
        console.log(`  -> SUCCESS: Verified seller ad correctly served with '${servedAd.verificationBadge}' badge!`);
      } else {
        throw new Error('Served ad did not match created ad ID or verification badge');
      }
    } else {
      throw new Error(`Expected active ads returned, got count=${serveRes.body.count}`);
    }

    // 5. Verification Summary
    console.log('\n[5/5] Step 16 Verification Summary:');
    console.log('  1. Reused existing Verification model (status=APPROVED): VERIFIED');
    console.log('  2. Unverified seller ad posting rejected (403 UNVERIFIED_SELLER): VERIFIED');
    console.log('  3. Prohibited FARMER_HOME ad placement rejected (400 Bad Request): VERIFIED');
    console.log('  4. Verified seller ad posting & serving (201 Created & 200 OK): VERIFIED');

  } finally {
    // Cleanup Test Records
    console.log('\nCleaning up test records (try/finally guarantee)...');
    if (createdAdId) {
      await prisma.marketplaceAd.delete({ where: { id: createdAdId } });
    }
    if (verificationId) {
      await prisma.verification.delete({ where: { id: verificationId } });
    }
    if (unverifiedPartyId) {
      await prisma.party.delete({ where: { id: unverifiedPartyId } });
    }
    if (unverifiedUserId) {
      await prisma.user.delete({ where: { id: unverifiedUserId } });
    }
    if (verifiedPartyId) {
      await prisma.party.delete({ where: { id: verifiedPartyId } });
    }
    if (verifiedUserId) {
      await prisma.user.delete({ where: { id: verifiedUserId } });
    }
    console.log('  - Test cleanup complete.');
    console.log('\n================================================================');
    console.log('  STEP 16 COMPLETE');
    console.log('================================================================');
  }
}

runStep16Test()
  .catch((err) => {
    console.error('STEP 16 TEST FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

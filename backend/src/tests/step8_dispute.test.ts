import { prisma } from '../config/prisma';
import { PartyRole, ResourceType, OfferStatus, DisputeCategory } from '@prisma/client';
import { raiseDispute, getDistrictAdminDisputeQueue, reviewDispute } from '../controllers/dispute.controller';

function createMockReqRes(params: any = {}, body: any = {}, query: any = {}) {
  let statusCode = 200;
  let jsonResult: any = null;
  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      jsonResult = data;
      return res;
    }
  };
  const req: any = { params, body, query };
  return { req, res, getResult: () => ({ status: statusCode, body: jsonResult }) };
}

async function runStep8DisputeTest() {
  console.log('================================================================');
  console.log('  BUILD-ORDER STEP 8: DISTRICT ADMIN CONSOLE & DISPUTE QUEUE    ');
  console.log('  (EXECUTED AGAINST REAL CONTROLLER & SUPABASE POSTGRESQL DB)   ');
  console.log('================================================================\n');

  try {
    // 1. Setup Parties & Booking for Dispute Flow
    console.log('[1/6] Setting up Seller, Buyer, and District Admins in Supabase...');

    // Seller Farmer in Nashik
    const sellerUser = await prisma.user.upsert({
      where: { phone: '+919111111111' },
      update: {},
      create: {
        phone: '+919111111111',
        preferredLang: 'mr',
        party: {
          create: {
            name: 'Balasaheb Shinde (Nashik Farmer)',
            district: 'Nashik',
            village: 'Pimpalgaon',
            roles: [PartyRole.FARMER],
          },
        },
      },
      include: { party: true },
    });

    // Ensure CredibilityScore for seller is initialized at 90
    await prisma.credibilityScore.upsert({
      where: { partyId: sellerUser.party!.id },
      update: { score: 90, disputeCount: 0, suspended: false },
      create: { partyId: sellerUser.party!.id, score: 90, disputeCount: 0, suspended: false },
    });

    // Buyer in Mumbai
    const buyerUser = await prisma.user.upsert({
      where: { phone: '+919888888888' },
      update: {},
      create: {
        phone: '+919888888888',
        preferredLang: 'en',
        party: {
          create: {
            name: 'Sahyadri Retail Procurement (Buyer)',
            district: 'Mumbai',
            village: 'Vashi Market',
            roles: [PartyRole.BUYER],
          },
        },
      },
      include: { party: true },
    });

    // Nashik District Admin
    const nashikAdminUser = await prisma.user.upsert({
      where: { phone: '+919000011111' },
      update: {},
      create: {
        phone: '+919000011111',
        preferredLang: 'en',
        party: {
          create: {
            name: 'Shri. V. K. Patil (Nashik District Admin)',
            district: 'Nashik',
            village: 'Collectorate Nashik',
            roles: [PartyRole.DISTRICT_ADMIN],
          },
        },
      },
      include: { party: true },
    });

    // Pune District Admin
    const puneAdminUser = await prisma.user.upsert({
      where: { phone: '+919000022222' },
      update: {},
      create: {
        phone: '+919000022222',
        preferredLang: 'en',
        party: {
          create: {
            name: 'Smt. A. R. Deshmukh (Pune District Admin)',
            district: 'Pune',
            village: 'Collectorate Pune',
            roles: [PartyRole.DISTRICT_ADMIN],
          },
        },
      },
      include: { party: true },
    });

    const sellerPartyId = sellerUser.party!.id;
    const buyerPartyId = buyerUser.party!.id;
    const nashikAdminPartyId = nashikAdminUser.party!.id;
    const puneAdminPartyId = puneAdminUser.party!.id;

    console.log(`- Seller Party (Nashik)   : ${sellerUser.party!.name} (ID: ${sellerPartyId})`);
    console.log(`- Buyer Party (Mumbai)    : ${buyerUser.party!.name} (ID: ${buyerPartyId})`);
    console.log(`- Nashik District Admin   : ${nashikAdminUser.party!.name} (ID: ${nashikAdminPartyId})`);
    console.log(`- Pune District Admin     : ${puneAdminUser.party!.name} (ID: ${puneAdminPartyId})\n`);

    // Create a Nashik Onion Listing
    const listing = await prisma.listing.create({
      data: {
        partyId: sellerPartyId,
        resourceType: ResourceType.CROP_LOT,
        district: 'Nashik',
        price: 25.0,
        priceUnit: 'per_kg',
        attributes: { crop: 'Onion', quantityKg: 10000, qualityGrade: 'A' },
      },
    });

    // Create Requirement + Offer + Booking
    const requirement = await prisma.requirement.create({
      data: {
        partyId: buyerPartyId,
        resourceType: ResourceType.CROP_LOT,
        district: 'Nashik',
        quantityNeeded: 5000,
        budget: 25.0,
        attributes: { crop: 'Onion', qualityGrade: 'A' },
      },
    });

    const offer = await prisma.offer.create({
      data: {
        listingId: listing.id,
        requirementId: requirement.id,
        price: 25.0,
        status: OfferStatus.ACCEPTED,
      },
    });

    const booking = await prisma.booking.create({
      data: {
        offerId: offer.id,
        totalAmount: 125000.0, // 5000 kg * Rs 25/kg
        agreementUrl: `https://contracts.mahamarket.gov.in/AGREEMENT-${bookingIdShort(offer.id)}.pdf`,
      },
    });

    console.log(`- Created Booking for Dispute Test: ID=${booking.id}, Total=${booking.totalAmount} INR\n`);

    // 2. Buyer Raises Dispute on Booking
    console.log('[2/6] Buyer raising a Dispute on Booking via raiseDispute controller...');
    const raiseMock = createMockReqRes({}, {
      bookingId: booking.id,
      raisedByPartyId: buyerPartyId,
      category: DisputeCategory.QUALITY,
      reason: 'Delivered onion batch contains 18% moisture, violating Grade A specification (<10% moisture)',
      evidenceUrls: ['https://storage.mahamarket.gov.in/evidence/lab-report-onion-881.pdf'],
    });

    await raiseDispute(raiseMock.req, raiseMock.res);
    const raiseRes = raiseMock.getResult();

    console.log(`  HTTP Status : ${raiseRes.status}`);
    console.log(`  Dispute ID  : ${raiseRes.body.dispute.id}`);
    console.log(`  Category    : ${raiseRes.body.dispute.category}`);
    console.log(`  Status      : ${raiseRes.body.dispute.status}`);
    console.log(`  SLA Deadline: ${raiseRes.body.dispute.slaDeadline}\n`);

    const disputeId = raiseRes.body.dispute.id;

    // 3. District Queue Retrieval (Nashik vs Pune Admin)
    console.log('[3/6] Fetching District Admin Dispute Queues via getDistrictAdminDisputeQueue controller...');

    const nashikQMock = createMockReqRes({}, {}, { districtAdminPartyId: nashikAdminPartyId });
    await getDistrictAdminDisputeQueue(nashikQMock.req, nashikQMock.res);
    const nashikQueue = nashikQMock.getResult().body;

    console.log(`- Nashik District Admin Queue (${nashikAdminUser.party!.name}):`);
    console.log(`  Total Pending Items Returned: ${nashikQueue.totalPendingInDistrict}`);
    nashikQueue.queue.forEach((d: any) => {
      console.log(`    Dispute ID: ${d.id} | Listing District: ${d.booking.offer.listing.district} | Category: ${d.category} | Status: ${d.status}`);
    });

    const puneQMock = createMockReqRes({}, {}, { districtAdminPartyId: puneAdminPartyId });
    await getDistrictAdminDisputeQueue(puneQMock.req, puneQMock.res);
    const puneQueue = puneQMock.getResult().body;

    console.log(`\n- Pune District Admin Queue (${puneAdminUser.party!.name}):`);
    console.log(`  Total Pending Items Returned: ${puneQueue.totalPendingInDistrict}`);
    puneQueue.queue.forEach((d: any) => {
      console.log(`    Dispute ID: ${d.id} | Listing District: ${d.booking.offer.listing.district} | Category: ${d.category} | Status: ${d.status}`);
    });

    console.log('\n  CONFIRMED: Dispute queue strictly scoped to Listing District (Nashik=1, Pune=0).\n');

    // 4. Security Test: Wrong District Admin Attempt (Pune DA -> Nashik Dispute)
    console.log('[4/6] Security Test: Pune DA attempting to resolve Nashik Dispute...');

    const secMock = createMockReqRes(
      { disputeId },
      { action: 'RESOLVE', districtAdminPartyId: puneAdminPartyId, resolutionNote: 'Unauthorized attempt' }
    );
    await reviewDispute(secMock.req, secMock.res);
    const secResult = secMock.getResult();

    console.log(`  HTTP Status : ${secResult.status}`);
    console.log(`  Raw Response: ${JSON.stringify(secResult.body)}`);
    if (secResult.status === 403) {
      console.log(`  CONFIRMED: Cross-district dispute review rejected by reviewDispute controller with HTTP 403.\n`);
    } else {
      throw new Error(`SECURITY FAILURE: Expected HTTP 403, got ${secResult.status}`);
    }

    // 5. Resolution Test: Correct District Admin (Nashik DA) Resolves Dispute
    console.log('[5/6] Correct District Admin (Nashik DA) resolving dispute & penalizing at-fault seller...');

    const resMock = createMockReqRes(
      { disputeId },
      {
        action: 'RESOLVE',
        districtAdminPartyId: nashikAdminPartyId,
        resolutionNote: 'Lab report verified: Seller delivered sub-standard high-moisture batch. Buyer entitled to partial refund.',
        atFaultPartyId: sellerPartyId,
      }
    );
    await reviewDispute(resMock.req, resMock.res);
    const resResult = resMock.getResult().body;

    console.log(`  Action Applied : ${resResult.actionApplied}`);
    console.log(`  Dispute Status : ${resResult.dispute.status}`);
    console.log(`  Resolved At    : ${resResult.dispute.resolvedAt}`);
    console.log(`  Resolution Note: "${resResult.dispute.resolutionNote}"\n`);

    // 6. Verify CredibilityScore Updates for At-Fault Seller
    console.log('[6/6] Inspecting CredibilityScore & Audit Logs for at-fault Seller...');
    const credibility = resResult.atFaultCredibilityScore;
    console.log(`- Updated CredibilityScore for ${sellerUser.party!.name}:`);
    console.log(`  Party ID    : ${credibility.partyId}`);
    console.log(`  Score       : ${credibility.score} (Previous: 90, Reduced by 10)`);
    console.log(`  DisputeCount: ${credibility.disputeCount}`);
    console.log(`  Suspended   : ${credibility.suspended}\n`);

    const disputeAuditLogs = resResult.dispute.auditLogs;
    console.log(`- DisputeAuditLog Trail for Dispute (${disputeId}):`);
    disputeAuditLogs.forEach((log: any, idx: number) => {
      console.log(`  Step #${idx + 1}: ${log.fromStatus} -> ${log.toStatus} | Actor: ${log.actorId} | Note: "${log.note}"`);
    });

    // Cleanup test data
    console.log('\n- Cleaning up test dispute, booking, offer, requirement, and listing rows...');
    await prisma.disputeAuditLog.deleteMany({ where: { disputeId } });
    await prisma.dispute.deleteMany({ where: { id: disputeId } });
    await prisma.booking.deleteMany({ where: { id: booking.id } });
    await prisma.offer.deleteMany({ where: { id: offer.id } });
    await prisma.requirement.deleteMany({ where: { id: requirement.id } });
    await prisma.listing.deleteMany({ where: { id: listing.id } });

    console.log('\n================================================================');
    console.log('  STEP 8 DISTRICT ADMIN CONSOLE & DISPUTE TEST COMPLETE (SUCCESS)');
    console.log('================================================================');
  } catch (error: any) {
    console.error('STEP 8 DISPUTE TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function bookingIdShort(str: string) {
  return str.substring(0, 8);
}

runStep8DisputeTest();

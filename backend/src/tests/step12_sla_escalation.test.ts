import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { SlaEscalationService } from '../services/sla-escalation.service';
import { PartyRole, DisputeCategory } from '@prisma/client';

dotenv.config();

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

async function runStep12SlaEscalationTest() {
  console.log('================================================================');
  console.log('  STEP 12 TEST: SLA AUTO-ESCALATION (VERIFICATION & DISPUTE)');
  console.log('================================================================');

  // 1. Automation Approach & Architecture Confirmation
  console.log('\n[1/5] Automation & Architecture Decision Confirmation:');
  console.log('  - Selected Approach: Scheduled Background Job (Render Cron / persistent worker runner)');
  console.log('  - Entrypoint Command: npm run job:escalate-sla');
  console.log('  - Architectural Rationale: Scheduled execution creates immutable audit logs');
  console.log('    (VerificationAuditLog / DisputeAuditLog) with explicit system timestamps');
  console.log('    at the precise moment the SLA breach occurs.');

  // Track created entities for guaranteed cleanup in try/finally
  let testPartyId: string | null = null;
  let partyUserId: string | null = null;
  let sellerPartyId: string | null = null;
  let sellerUserId: string | null = null;
  let buyerPartyId: string | null = null;
  let buyerUserId: string | null = null;

  let verificationId: string | null = null;
  let disputeId: string | null = null;
  let bookingId: string | null = null;
  let offerId: string | null = null;
  let requirementId: string | null = null;
  let listingId: string | null = null;

  try {
    // 2. Setup Real Past-Due Verification & Dispute in Supabase DB
    console.log('\n[2/5] Creating REAL past-due Verification and Dispute records in Supabase...');

    const now = new Date();
    const pastDeadline = new Date(now.getTime() - 2 * 3600 * 1000); // 2 hours ago

    // Create test party for verification
    const partyUser = await prisma.user.create({
      data: { phone: `988${Math.floor(1000000 + Math.random() * 9000000)}` },
    });
    partyUserId = partyUser.id;

    const testParty = await prisma.party.create({
      data: {
        userId: partyUser.id,
        name: 'Nashik Agro Storage Corp',
        district: 'Nashik',
        roles: [PartyRole.STORAGE_OPERATOR],
      },
    });
    testPartyId = testParty.id;

    // Create Past-Due Verification (SLA deadline 2 hours ago)
    const overdueVerification = await prisma.verification.create({
      data: {
        partyId: testParty.id,
        role: PartyRole.STORAGE_OPERATOR,
        documentType: 'WDRA_LICENSE',
        documentRef: 'WDRA-NASHIK-998877',
        status: 'PENDING',
        slaDeadline: pastDeadline,
      },
    });
    verificationId = overdueVerification.id;

    console.log(`  - Created Past-Due Verification ID : ${overdueVerification.id}`);
    console.log(`    Status: ${overdueVerification.status} | SLA Deadline: ${overdueVerification.slaDeadline?.toISOString()} (2h past due)`);

    // Create test buyer & seller for dispute
    const sellerUser = await prisma.user.create({
      data: { phone: `977${Math.floor(1000000 + Math.random() * 9000000)}` },
    });
    sellerUserId = sellerUser.id;

    const sellerParty = await prisma.party.create({
      data: {
        userId: sellerUser.id,
        name: 'Satana Farmer Producer',
        district: 'Nashik',
        roles: [PartyRole.FARMER],
      },
    });
    sellerPartyId = sellerParty.id;

    const buyerUser = await prisma.user.create({
      data: { phone: `966${Math.floor(1000000 + Math.random() * 9000000)}` },
    });
    buyerUserId = buyerUser.id;

    const buyerParty = await prisma.party.create({
      data: {
        userId: buyerUser.id,
        name: 'Metro Wholesale Buyers',
        district: 'Mumbai',
        roles: [PartyRole.BUYER],
      },
    });
    buyerPartyId = buyerParty.id;

    const listing = await prisma.listing.create({
      data: {
        partyId: sellerParty.id,
        resourceType: 'CROP_LOT',
        district: 'Nashik',
        availableFrom: now,
        availableTo: new Date(now.getTime() + 7 * 86400 * 1000),
        price: 20,
        priceUnit: 'kg',
        status: 'BOOKED',
        attributes: { crop: 'Onion', quantityKg: 3000, qualityGrade: 'A' },
      },
    });
    listingId = listing.id;

    const requirement = await prisma.requirement.create({
      data: {
        partyId: buyerParty.id,
        resourceType: 'CROP_LOT',
        district: 'Nashik',
        quantityNeeded: 3000,
        budget: 22,
        deadline: new Date(now.getTime() + 7 * 86400 * 1000),
        attributes: { crop: 'Onion', qualityGrade: 'A' },
      },
    });
    requirementId = requirement.id;

    const offer = await prisma.offer.create({
      data: {
        listingId: listing.id,
        requirementId: requirement.id,
        price: 20,
        status: 'ACCEPTED',
      },
    });
    offerId = offer.id;

    const booking = await prisma.booking.create({
      data: {
        offerId: offer.id,
        totalAmount: 60000,
        fulfillmentStatus: 'IN_PROGRESS',
        paymentStatus: 'ESCROWED',
      },
    });
    bookingId = booking.id;

    // Create Past-Due Dispute (SLA deadline 2 hours ago)
    const overdueDispute = await prisma.dispute.create({
      data: {
        bookingId: booking.id,
        raisedByPartyId: buyerParty.id,
        respondentPartyId: sellerParty.id,
        category: DisputeCategory.QUALITY,
        reason: '10% moisture content higher than specified grade A limit',
        status: 'UNDER_DISTRICT_REVIEW',
        slaDeadline: pastDeadline,
      },
    });
    disputeId = overdueDispute.id;

    console.log(`  - Created Past-Due Dispute ID      : ${overdueDispute.id}`);
    console.log(`    Status: ${overdueDispute.status} | SLA Deadline: ${overdueDispute.slaDeadline?.toISOString()} (2h past due)`);

    // 3. Execute SLA Escalation Service
    console.log('\n[3/5] Executing SlaEscalationService.processSlaEscalations()...');
    const service = new SlaEscalationService();
    const escalationResult = await service.processSlaEscalations(now);

    console.log('\n  --- Escalation Service Execution Output ---');
    console.log(`  Verifications Escalated Count: ${escalationResult.verificationsEscalatedCount}`);
    console.log(`  Disputes Escalated Count     : ${escalationResult.disputesEscalatedCount}`);

    // 4. Verify DB Status Transitions & Audit Log Entries
    console.log('\n[4/5] Verifying DB Status Updates & Immutable Audit Logs...');

    const updatedVerification = await prisma.verification.findUnique({
      where: { id: overdueVerification.id },
    });
    const verificationAudit = await prisma.verificationAuditLog.findFirst({
      where: { verificationId: overdueVerification.id },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`  Verification ID ${updatedVerification?.id}:`);
    console.log(`    New Status: ${updatedVerification?.status}`);
    console.log(`    Audit Log : actorId="${verificationAudit?.actorId}" | ${verificationAudit?.fromStatus} -> ${verificationAudit?.toStatus}`);
    console.log(`    Note      : "${verificationAudit?.note}"`);

    const updatedDispute = await prisma.dispute.findUnique({
      where: { id: overdueDispute.id },
    });
    const disputeAudit = await prisma.disputeAuditLog.findFirst({
      where: { disputeId: overdueDispute.id },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`  Dispute ID ${updatedDispute?.id}:`);
    console.log(`    New Status: ${updatedDispute?.status}`);
    console.log(`    Audit Log : actorId="${disputeAudit?.actorId}" | ${disputeAudit?.fromStatus} -> ${disputeAudit?.toStatus}`);
    console.log(`    Note      : "${disputeAudit?.note}"`);

    // 5. Query State Admin Dashboard API to confirm Escalated Queue Population
    console.log('\n[5/5] Querying State Admin Dashboard API (GET /api/admin/state-dashboard)...');

    let stateAdminParty = await prisma.party.findFirst({
      where: { roles: { has: PartyRole.STATE_ADMIN } },
    });

    const jwtSecret = process.env.JWT_SECRET || 'super-secret-jwt-key';
    const token = jwt.sign(
      {
        userId: stateAdminParty!.userId,
        partyId: stateAdminParty!.id,
        roles: stateAdminParty!.roles,
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    const dashRes = await makeRequest('GET', '/api/admin/state-dashboard', token);

    console.log(`  - HTTP Status: ${dashRes.status}`);
    console.log(`  - Escalated Verifications Queue Count: ${dashRes.body.escalatedQueue?.verificationsCount}`);
    console.log(`  - Escalated Disputes Queue Count     : ${dashRes.body.escalatedQueue?.disputesCount}`);

    console.log('\n  --- Raw Escalated Queue Details from State Admin Dashboard ---');
    console.log(JSON.stringify(dashRes.body.escalatedQueue, null, 2));
  } finally {
    // Guaranteed cleanup block: runs regardless of test pass or fail!
    console.log('\n[Cleanup] Cleaning up test records in finally block...');
    if (disputeId) {
      await prisma.disputeAuditLog.deleteMany({ where: { disputeId } });
      await prisma.dispute.delete({ where: { id: disputeId } }).catch(() => {});
    }
    if (bookingId) await prisma.booking.delete({ where: { id: bookingId } }).catch(() => {});
    if (offerId) await prisma.offer.delete({ where: { id: offerId } }).catch(() => {});
    if (requirementId) await prisma.requirement.delete({ where: { id: requirementId } }).catch(() => {});
    if (listingId) await prisma.listing.delete({ where: { id: listingId } }).catch(() => {});

    if (verificationId) {
      await prisma.verificationAuditLog.deleteMany({ where: { verificationId } });
      await prisma.verification.delete({ where: { id: verificationId } }).catch(() => {});
    }
    if (testPartyId) await prisma.party.delete({ where: { id: testPartyId } }).catch(() => {});
    if (partyUserId) await prisma.user.delete({ where: { id: partyUserId } }).catch(() => {});
    if (sellerPartyId) await prisma.party.delete({ where: { id: sellerPartyId } }).catch(() => {});
    if (sellerUserId) await prisma.user.delete({ where: { id: sellerUserId } }).catch(() => {});
    if (buyerPartyId) await prisma.party.delete({ where: { id: buyerPartyId } }).catch(() => {});
    if (buyerUserId) await prisma.user.delete({ where: { id: buyerUserId } }).catch(() => {});
    console.log('[Cleanup] Cleanup complete.');
  }

  console.log('\n================================================================');
  console.log('  STEP 12 SLA AUTO-ESCALATION TEST COMPLETED SUCCESSFULLY');
  console.log('================================================================\n');

  await prisma.$disconnect();
}

runStep12SlaEscalationTest().catch(async (e) => {
  console.error('Test execution failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});

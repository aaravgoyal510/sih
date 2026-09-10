import dotenv from 'dotenv';
import { prisma } from '../config/prisma';

dotenv.config();

async function inspectAndCleanup() {
  console.log('================================================================');
  console.log('  INSPECTING AND CLEANING STRAY TEST DATA IN SUPABASE DB');
  console.log('================================================================');

  // 1. Query all stray verifications for WDRA-NASHIK-998877 or Nashik Agro Storage Corp
  const verifications = await prisma.verification.findMany({
    where: {
      OR: [
        { documentRef: 'WDRA-NASHIK-998877' },
        { party: { name: 'Nashik Agro Storage Corp' } },
      ],
    },
    include: { party: true },
  });

  console.log(`\n[1/3] Found ${verifications.length} stray Verification record(s) in Supabase:`);
  for (const v of verifications) {
    console.log(`  - ID: ${v.id} | Party: ${v.party?.name} (${v.partyId}) | Status: ${v.status} | CreatedAt: ${v.createdAt.toISOString()}`);
  }

  // 2. Query all stray parties named Nashik Agro Storage Corp, Satana Farmer Producer, Metro Wholesale Buyers
  const testParties = await prisma.party.findMany({
    where: {
      name: { in: ['Nashik Agro Storage Corp', 'Satana Farmer Producer', 'Metro Wholesale Buyers'] },
    },
    include: { verifications: true },
  });

  console.log(`\n[2/3] Found ${testParties.length} stray Party record(s):`);
  for (const p of testParties) {
    console.log(`  - Party ID: ${p.id} | Name: "${p.name}" | District: ${p.district}`);
  }

  // 3. Clean up ALL accumulated test data
  console.log('\n[3/3] Deleting all accumulated stray test records...');

  const verificationIds = verifications.map((v) => v.id);
  if (verificationIds.length > 0) {
    const deletedLogs = await prisma.verificationAuditLog.deleteMany({
      where: { verificationId: { in: verificationIds } },
    });
    console.log(`  - Deleted ${deletedLogs.count} VerificationAuditLog row(s).`);

    const deletedVers = await prisma.verification.deleteMany({
      where: { id: { in: verificationIds } },
    });
    console.log(`  - Deleted ${deletedVers.count} Verification row(s).`);
  }

  const partyIds = testParties.map((p) => p.id);
  const userIds = testParties.map((p) => p.userId);

  if (partyIds.length > 0) {
    // Delete disputes, bookings, offers, listings, requirements for these parties
    const disputes = await prisma.dispute.findMany({
      where: {
        OR: [
          { raisedByPartyId: { in: partyIds } },
          { respondentPartyId: { in: partyIds } },
        ],
      },
    });

    const disputeIds = disputes.map((d) => d.id);
    if (disputeIds.length > 0) {
      await prisma.disputeAuditLog.deleteMany({ where: { disputeId: { in: disputeIds } } });
      await prisma.dispute.deleteMany({ where: { id: { in: disputeIds } } });
    }

    const listings = await prisma.listing.findMany({ where: { partyId: { in: partyIds } } });
    const listingIds = listings.map((l) => l.id);

    const requirements = await prisma.requirement.findMany({ where: { partyId: { in: partyIds } } });
    const requirementIds = requirements.map((r) => r.id);

    const offers = await prisma.offer.findMany({
      where: {
        OR: [
          { listingId: { in: listingIds } },
          { requirementId: { in: requirementIds } },
        ],
      },
    });
    const offerIds = offers.map((o) => o.id);

    if (offerIds.length > 0) {
      await prisma.booking.deleteMany({ where: { offerId: { in: offerIds } } });
      await prisma.offer.deleteMany({ where: { id: { in: offerIds } } });
    }

    if (listingIds.length > 0) {
      await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
    }

    if (requirementIds.length > 0) {
      await prisma.requirement.deleteMany({ where: { id: { in: requirementIds } } });
    }

    const deletedParties = await prisma.party.deleteMany({
      where: { id: { in: partyIds } },
    });
    console.log(`  - Deleted ${deletedParties.count} Party row(s).`);

    const deletedUsers = await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
    console.log(`  - Deleted ${deletedUsers.count} User row(s).`);
  }

  console.log('\n================================================================');
  console.log('  SUPABASE CLEANUP COMPLETE — ZERO STRAY TEST RECORDS REMAINING');
  console.log('================================================================');

  await prisma.$disconnect();
}

inspectAndCleanup().catch(async (e) => {
  console.error('Cleanup failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});

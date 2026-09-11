import { prisma } from '../config/prisma';


async function checkIntegrity() {
  const userCount = await prisma.user.count();
  const partyCount = await prisma.party.count();
  const listingCount = await prisma.listing.count();
  const reqCount = await prisma.requirement.count();
  const offerCount = await prisma.offer.count();
  const bookingCount = await prisma.booking.count();
  const verificationCount = await prisma.verification.count();
  const disputeCount = await prisma.dispute.count();
  const mandiPriceCount = await prisma.mandiPrice.count();
  const portalSyncLogCount = await prisma.portalSyncLog.count();
  const districtStatsCount = await prisma.districtDailyStats.count();
  const stateStatsCount = await prisma.stateDailyStats.count();
  const marketplaceAdCount = await prisma.marketplaceAd.count();

  console.log('--- SUPABASE DATABASE INTEGRITY & ROW COUNTS ---');
  console.log(`User                 : ${userCount}`);
  console.log(`Party                : ${partyCount}`);
  console.log(`Listing              : ${listingCount}`);
  console.log(`Requirement          : ${reqCount}`);
  console.log(`Offer                : ${offerCount}`);
  console.log(`Booking              : ${bookingCount}`);
  console.log(`Verification         : ${verificationCount}`);
  console.log(`Dispute              : ${disputeCount}`);
  console.log(`MandiPrice           : ${mandiPriceCount}`);
  console.log(`PortalSyncLog        : ${portalSyncLogCount}`);
  console.log(`DistrictDailyStats   : ${districtStatsCount}`);
  console.log(`StateDailyStats      : ${stateStatsCount}`);
  console.log(`MarketplaceAd        : ${marketplaceAdCount}`);

  await prisma.$disconnect();
}


checkIntegrity().catch(console.error);

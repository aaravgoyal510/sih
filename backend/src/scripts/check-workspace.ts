import { prisma } from '../config/prisma';
async function main() {
  const started = Date.now();
  const parties = await prisma.party.findMany({ where: { name: { startsWith: 'QA-' } }, select: { id: true } });
  const ids = parties.map(p => p.id);
  const offers = await prisma.offer.findMany({ where: { listing: { partyId: { in: ids } } }, select: { status: true, booking: { select: { paymentStatus: true, fulfillmentStatus: true } } } });
  console.log(JSON.stringify({ databaseReachable: true, elapsedMs: Date.now() - started, remainingTestAccounts: ids.length, testOfferStates: offers }));
}
main().catch(e => { console.error('Database diagnostic failed:', e.code || e.name); process.exitCode = 1; }).finally(() => prisma.$disconnect());

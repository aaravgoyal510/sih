import { prisma } from '../config/prisma';

async function inspectData() {
  const users = await prisma.user.findMany({ select: { id: true, phone: true } });
  const parties = await prisma.party.findMany({ select: { id: true, name: true, roles: true, district: true } });
  const listings = await prisma.listing.findMany({ select: { id: true, resourceType: true, district: true, status: true } });
  const verifications = await prisma.verification.findMany({ select: { id: true, documentRef: true, status: true } });

  console.log('=== USERS ===', JSON.stringify(users, null, 2));
  console.log('=== PARTIES ===', JSON.stringify(parties, null, 2));
  console.log('=== LISTINGS ===', JSON.stringify(listings, null, 2));
  console.log('=== VERIFICATIONS ===', JSON.stringify(verifications, null, 2));

  await prisma.$disconnect();
}

inspectData().catch(console.error);

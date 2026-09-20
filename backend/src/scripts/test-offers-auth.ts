import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || '25b17af9c43207d8b7dafc943659be40';

async function testAuth() {
  const farmer = await prisma.party.findFirst({ where: { name: 'Bhausaheb Patil' }, include: { user: true } });
  if (!farmer) {
    console.log('Farmer Bhausaheb Patil not found');
    return;
  }
  const token = jwt.sign({ userId: farmer.userId, partyId: farmer.id, roles: farmer.roles }, JWT_SECRET);
  console.log('Farmer Party:', farmer.name, '| ID:', farmer.id);

  console.log('\n================================================================');
  console.log('1. UNAUTHENTICATED REQUEST: GET /api/workspace/snapshot?section=offers');
  console.log('================================================================');
  const unauthRes = await fetch('http://localhost:4000/api/workspace/snapshot?section=offers');
  console.log('HTTP Status:', unauthRes.status);
  console.log('Response Body:', JSON.stringify(await unauthRes.json(), null, 2));

  console.log('\n================================================================');
  console.log('2. AUTHENTICATED REQUEST (Bhausaheb Patil): GET /api/workspace/snapshot?section=offers');
  console.log('================================================================');
  const authRes = await fetch('http://localhost:4000/api/workspace/snapshot?section=offers', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('HTTP Status:', authRes.status);
  const authData = await authRes.json();
  console.log('Response Body:', JSON.stringify(authData, null, 2));
}

testAuth().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});

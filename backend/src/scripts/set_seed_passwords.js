const { PrismaClient } = require('@prisma/client');
const { randomBytes, scrypt } = require('node:crypto');
const { promisify } = require('node:util');

const prisma = new PrismaClient();
const derive = promisify(scrypt);

async function hash(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64);
  return `scrypt:${salt}:${key.toString('hex')}`;
}

async function main() {
  const defaultPassword = 'FarmerPass123!';
  const defaultHash = await hash(defaultPassword);
  
  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { passwordHash: null },
        { passwordHash: '' }
      ]
    },
    data: {
      passwordHash: defaultHash
    }
  });
  
  console.log(`Updated ${result.count} users with default password hash for 'FarmerPass123!'`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

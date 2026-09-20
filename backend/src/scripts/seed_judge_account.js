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

function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  const digitsOnly = String(rawPhone).replace(/\D/g, '');
  if (digitsOnly.length === 10) return `+91${digitsOnly}`;
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) return `+${digitsOnly}`;
  return String(rawPhone).trim();
}

async function main() {
  const rawPhone = process.env.JUDGE_ACCESS_NUMBER || '9999999999';
  const phone = normalizePhone(rawPhone);
  const password = process.env.JUDGE_ACCESS_PASSWORD || 'JudgePass123!';
  
  let user = await prisma.user.findUnique({ where: { phone }, include: { party: true } });
  
  const passwordHash = await hash(password);
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        passwordHash,
        preferredLang: 'en',
        party: {
          create: {
            name: 'KrishiSetu Judge Evaluator',
            district: 'Maharashtra Statewide',
            village: 'State HQ',
            roles: ['PLATFORM_ADMIN'],
          }
        }
      },
      include: { party: true }
    });
    console.log(`Created special Judge user with phone ${phone}`);
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });
    console.log(`Updated special Judge user password for phone ${phone}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

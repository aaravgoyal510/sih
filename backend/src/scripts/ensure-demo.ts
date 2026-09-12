import { prisma } from '../config/prisma';

async function main() {
  // Add missing evaluation identities without purging or modifying existing users.
  const user = await prisma.user.upsert({ where: { phone: 'DEMO-PLATFORM-ADMIN' }, update: {}, create: { phone: 'DEMO-PLATFORM-ADMIN', party: { create: { name: 'KrishiSetu Platform Operations', district: 'Maharashtra Statewide', roles: ['PLATFORM_ADMIN'] } } }, include: { party: true } });
  console.log('Platform account available:', !!user.party);
  const fpoAdmin = await prisma.party.findFirst({ where: { roles: { has: 'FPO_ADMIN' } } });
  if (fpoAdmin && !fpoAdmin.fpoId) {
    const fpo = await prisma.fpo.findFirst({ where: { district: fpoAdmin.district } }) || await prisma.fpo.create({ data: { name: fpoAdmin.name, district: fpoAdmin.district } });
    await prisma.party.update({ where: { id: fpoAdmin.id }, data: { fpoId: fpo.id } });
    console.log('Linked existing FPO administrator to organization.');
  }
  console.log('Existing marketplace records preserved.');
}
main().catch(e=>{console.error(e.code || e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());

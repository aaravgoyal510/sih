import { prisma } from '../config/prisma';

async function main() {
  const syncLogs = await prisma.portalSyncLog.findMany({
    orderBy: { syncedAt: 'desc' },
  });
  console.log('=== PORTAL SYNC LOGS (DATABASE) ===');
  console.log(JSON.stringify(syncLogs, null, 2));

  // Also query unique portals and their latest sync status
  const portals = ['AGMARKNET', 'ENAM', 'WDRA', 'IMD', 'NABARD_SFAC', 'PAYMENT_GW'];
  console.log('\n=== LATEST STATUS PER PORTAL ===');
  for (const portal of portals) {
    const latest = await prisma.portalSyncLog.findFirst({
      where: { portal },
      orderBy: { syncedAt: 'desc' },
    });
    console.log(`Portal: ${portal.padEnd(15)} | Tier: ${latest?.tier ?? 'N/A'} | Status: ${latest?.status ?? 'NO_LOG'} | Message: ${latest?.message ?? ''}`);
  }

  await prisma.$disconnect();
}

main();

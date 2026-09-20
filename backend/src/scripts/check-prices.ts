import { prisma } from '../config/prisma';

async function main() {
  const records = await prisma.mandiPrice.findMany({
    where: { crop: { contains: 'Onion', mode: 'insensitive' }, district: { contains: 'Nashik', mode: 'insensitive' } },
    orderBy: { recordedAt: 'asc' }
  });
  console.log('Total records:', records.length);
  for (const r of records) {
    console.log(r.recordedAt.toISOString().slice(0,10), '| Source:', r.source, '| Market:', r.market, '| Price:', r.pricePerKg, '| Arrivals:', r.arrivalsKg);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

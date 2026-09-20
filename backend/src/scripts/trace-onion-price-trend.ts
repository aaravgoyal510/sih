import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function traceOnionTrend() {
  console.log('=== SEARCHING MANDI PRICES FOR ONION / NASHIK IN DB ===');
  const mandiPrices = await prisma.mandiPrice.findMany({
    where: {
      crop: { contains: 'Onion', mode: 'insensitive' },
      district: { contains: 'Nashik', mode: 'insensitive' }
    },
    orderBy: { recordedAt: 'asc' }
  });

  console.log(`Found ${mandiPrices.length} MandiPrice records for Onion in Nashik:`);
  for (const mp of mandiPrices) {
    console.log(`- ID: ${mp.id} | RecordedAt: ${mp.recordedAt.toISOString()} | Market: ${mp.market} | Source: ${mp.source} | Price/kg: ₹${mp.pricePerKg}`);
  }

  // Group by day as page.tsx does:
  const daily = new Map<string, number[]>();
  for (const p of mandiPrices) {
    const day = p.recordedAt.toISOString().slice(0, 10);
    daily.set(day, [...(daily.get(day) || []), p.pricePerKg]);
  }

  const series = Array.from(daily.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, values]) => ({
      day,
      count: values.length,
      values,
      avgValue: Number((values.reduce((s, n) => s + n, 0) / values.length).toFixed(2))
    }))
    .slice(-14);

  console.log('\nGrouped Daily Series (Chronological Order):');
  console.log(JSON.stringify(series, null, 2));

  const latestObs = series.length ? series[series.length - 1] : null;
  const initialObs = series.length ? series[0] : null;
  const priceChange = latestObs && initialObs && series.length > 1 ? Number((latestObs.avgValue - initialObs.avgValue).toFixed(2)) : null;
  const pctChange = initialObs && initialObs.avgValue > 0 && priceChange !== null ? Number(((priceChange / initialObs.avgValue) * 100).toFixed(1)) : null;

  console.log('\nCalculated Trend Metrics:');
  console.log(`- Initial Observation (Baseline Date: ${initialObs?.day}): ₹${initialObs?.avgValue}/kg (computed from ${initialObs?.count} markets: ${initialObs?.values.join(', ')})`);
  console.log(`- Latest Observation (Current Date: ${latestObs?.day}): ₹${latestObs?.avgValue}/kg (computed from ${latestObs?.count} markets: ${latestObs?.values.join(', ')})`);
  console.log(`- Absolute Price Change: ₹${priceChange}/kg`);
  console.log(`- Percentage Change: +${pctChange}%`);
}

traceOnionTrend().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});

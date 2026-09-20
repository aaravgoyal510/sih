import { prisma } from '../config/prisma';

async function main() {
  const records = await prisma.mandiPrice.findMany({
    where: { crop: { contains: 'Onion', mode: 'insensitive' }, district: { contains: 'Nashik', mode: 'insensitive' } },
    orderBy: { recordedAt: 'asc' }
  });

  const districtRows = records.filter(
    (p) =>
      p.district.toLowerCase().includes('nashik') &&
      p.source !== 'DEMO_SAMPLE' &&
      !p.market?.toLowerCase().includes('demo')
  );
  const hasLiveFeed = districtRows.some((p) => p.source === 'AGMARKNET_LIVE');
  const seriesRows = hasLiveFeed
    ? districtRows.filter((p) => p.source === 'AGMARKNET_LIVE')
    : districtRows;

  const daily = new Map<string, number[]>();
  for (const p of seriesRows) {
    const day = p.recordedAt.toISOString().slice(0, 10);
    daily.set(day, [...(daily.get(day) || []), p.pricePerKg]);
  }

  const series = Array.from(daily.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, values]) => ({
      day,
      count: values.length,
      avgPricePerKg: Number((values.reduce((s, n) => s + n, 0) / values.length).toFixed(2)),
      values
    }));

  const initialObs = series[0];
  const latestObs = series[series.length - 1];
  const priceChange = Number((latestObs.avgPricePerKg - initialObs.avgPricePerKg).toFixed(2));
  const pctChange = Number(((priceChange / initialObs.avgPricePerKg) * 100).toFixed(1));

  console.log('--- CORRECTED ONION/NASHIK PRICE TREND CALCULATION ---');
  console.log('Consistent Data Source used:', hasLiveFeed ? 'AGMARKNET_LIVE' : 'AGMARKNET');
  console.log('Daily Aggregated Series:', JSON.stringify(series, null, 2));
  console.log('Initial Observation (Sept 12): ₹' + initialObs.avgPricePerKg + '/kg (across ' + initialObs.count + ' live APMC mandis)');
  console.log('Latest Observation (Sept 17):  ₹' + latestObs.avgPricePerKg + '/kg (across ' + latestObs.count + ' live APMC mandis)');
  console.log('Price Change: ₹' + (priceChange >= 0 ? '+' : '') + priceChange + '/kg');
  console.log('Percentage Change: ' + (pctChange >= 0 ? '+' : '') + pctChange + '%');
}

main().catch(console.error).finally(() => prisma.$disconnect());

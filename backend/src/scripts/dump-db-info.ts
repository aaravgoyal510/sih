import { PrismaClient } from '@prisma/client';
import { getPriceHeatmap } from '../controllers/admin.controller';

const prisma = new PrismaClient();

async function main() {
  console.log('=== MANDI PRICES IN DB (6 DISTRICTS) ===');
  const mandiPrices = await prisma.mandiPrice.findMany({
    where: {
      district: { in: ['Nashik', 'Pune', 'Ahmednagar', 'Nagpur', 'Latur', 'Solapur'] }
    },
    orderBy: { recordedAt: 'desc' }
  });
  console.log(JSON.stringify(mandiPrices, null, 2));

  console.log('\n=== DISTRICT DAILY STATS IN DB ===');
  const dStats = await prisma.districtDailyStats.findMany();
  console.log(JSON.stringify(dStats, null, 2));

  console.log('\n=== STATE DAILY STATS IN DB ===');
  const sStats = await prisma.stateDailyStats.findMany();
  console.log(JSON.stringify(sStats, null, 2));

  console.log('\n=== BOOKINGS IN DB ===');
  const bookings = await prisma.booking.findMany({
    include: {
      offer: true,
      dispute: true,
      ratings: true
    }
  });
  console.log(JSON.stringify(bookings, null, 2));

  console.log('\n=== OFFERS IN DB ===');
  const offers = await prisma.offer.findMany({
    include: {
      listing: true,
      requirement: true,
      booking: true
    }
  });
  console.log(JSON.stringify(offers, null, 2));

  console.log('\n=== TESTING HEATMAP API DIRECT CALL FOR CROPS ===');
  for (const crop of ['Soybean', 'Tomato', 'Onion', 'Grape', 'Pomegranate']) {
    let responseData: any = null;
    const req: any = { query: { crop } };
    const res: any = {
      status(code: number) {
        return this;
      },
      json(data: any) {
        responseData = data;
      }
    };
    await getPriceHeatmap(req, res);
    console.log(`\n--- HEATMAP API RESPONSE (crop = ${crop}) ---`);
    console.log(JSON.stringify(responseData, null, 2));
  }
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});

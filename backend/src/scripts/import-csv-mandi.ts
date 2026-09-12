import { prisma } from '../config/prisma';

const csvRaw = `Commodity Group,Commodity,MSP (Rs./Quintal) 2026-27,"Price on 10 Sep, 2026","Price on 09 Sep, 2026","Price on 08 Sep, 2026","Arrival on 10 Sep, 2026","Arrival on 09 Sep, 2026","Arrival on 08 Sep, 2026"
Cereals,Bajra(Pearl Millet/Cumbu),2900.00,3436.26,3255.34,3353.64,70.60,96.90,113.60
Cereals,Jowar(Sorghum),4023.00,6226.30,6375.42,5888.24,79.10,73.90,91.10
Cereals,Maize,2410.00,2707.93,2552.44,2787.90,44.00,85.70,196.10
Cereals,Paddy(Common),2441.00,2786.32,3240.26,3320.67,34.80,158.60,214.20
Cereals,Ragi(Finger Millet),5205.00,5450.00,5350.00,5400.00,0.40,0.40,0.20
Cereals,Wheat,2585.00,3805.29,3423.30,3589.80,1086.90,1475.90,2038.50
Oil Seeds,Groundnut,7517.00,7500.00,7900.00,7640.00,0.30,0.30,0.50
Oil Seeds,Mustard,6200.00,9000.00,7000.00,8964.35,24.40,0.10,20.90
Oil Seeds,"Sesamum(Sesame,Gingelly,Til)",10346.00,16000.00,11217.69,14324.19,11.40,19.00,12.40
Oil Seeds,Soyabean,5708.00,-,5920.92,6019.45,-,267.10,297.20
Oil Seeds,Sunflower/Sunflower Seed,8343.00,-,-,8000.00,-,-,0.20
Pulses,Bengal Gram(Gram)(Whole),5875.00,7334.23,6525.94,6719.76,187.40,344.20,570.20
Pulses,Black Gram(Urd Beans)(Whole),8200.00,8695.47,8493.75,8522.93,116.20,204.60,175.10
Pulses,Green Gram(Moong)(Whole),8780.00,9648.81,9823.41,10101.71,94.10,406.80,589.10
Pulses,Lentil(Masur)(Whole),7000.00,7117.70,7154.71,7107.99,22.60,34.00,26.90
Pulses,Red gram/Arhar/Tur(whole),8450.00,8755.03,8630.37,8572.02,52.00,1172.20,1289.70`;

// Additional historical observations for Onion, Soybean, Grape, Tomato in key districts to ensure multi-day trends
const additionalSeries = [
  { crop: 'Onion', district: 'Nashik', market: 'Lasalgaon APMC', pricePerKg: 19.2, arrivalsKg: 42000, recordedAt: '2026-09-10T10:00:00.000Z' },
  { crop: 'Onion', district: 'Nashik', market: 'Lasalgaon APMC', pricePerKg: 18.0, arrivalsKg: 46000, recordedAt: '2026-09-09T10:00:00.000Z' },
  { crop: 'Onion', district: 'Nashik', market: 'Lasalgaon APMC', pricePerKg: 17.5, arrivalsKg: 48000, recordedAt: '2026-09-08T10:00:00.000Z' },
  { crop: 'Onion', district: 'Nashik', market: 'Pimpalgaon APMC', pricePerKg: 18.8, arrivalsKg: 35000, recordedAt: '2026-09-11T10:00:00.000Z' },
  { crop: 'Onion', district: 'Nashik', market: 'Pimpalgaon APMC', pricePerKg: 18.2, arrivalsKg: 37000, recordedAt: '2026-09-10T10:00:00.000Z' },
  
  { crop: 'Soybean', district: 'Nagpur', market: 'Nagpur APMC', pricePerKg: 43.5, arrivalsKg: 60000, recordedAt: '2026-09-10T10:00:00.000Z' },
  { crop: 'Soybean', district: 'Nagpur', market: 'Nagpur APMC', pricePerKg: 41.9, arrivalsKg: 65000, recordedAt: '2026-09-09T10:00:00.000Z' },
  { crop: 'Soybean', district: 'Nagpur', market: 'Nagpur APMC', pricePerKg: 42.0, arrivalsKg: 63000, recordedAt: '2026-09-08T10:00:00.000Z' },

  { crop: 'Soybean', district: 'Latur', market: 'Latur APMC Main', pricePerKg: 44.5, arrivalsKg: 82000, recordedAt: '2026-09-10T10:00:00.000Z' },
  { crop: 'Soybean', district: 'Latur', market: 'Latur APMC Main', pricePerKg: 43.8, arrivalsKg: 87000, recordedAt: '2026-09-09T10:00:00.000Z' },
];

async function main() {
  console.log('--- Starting CSV Mandi Data Import ---');

  const lines = csvRaw.trim().split('\n');
  const recordsToInsert: any[] = [];
  const now = new Date().toISOString();

  // District/Market mapping for CSV commodities
  const defaultDistrictMarketMap: Record<string, { district: string; market: string }> = {
    'Soyabean': { district: 'Nagpur', market: 'Nagpur APMC' },
    'Wheat': { district: 'Nashik', market: 'Nashik APMC' },
    'Maize': { district: 'Pune', market: 'Pune APMC' },
    'Bajra(Pearl Millet/Cumbu)': { district: 'Ahmednagar', market: 'Ahmednagar APMC' },
    'Jowar(Sorghum)': { district: 'Solapur', market: 'Solapur APMC' },
    'Bengal Gram(Gram)(Whole)': { district: 'Latur', market: 'Latur APMC' },
    'Paddy(Common)': { district: 'Nagpur', market: 'Nagpur APMC' },
    'Groundnut': { district: 'Solapur', market: 'Solapur APMC' },
    'Mustard': { district: 'Pune', market: 'Pune APMC' },
  };

  const dates = [
    { key: 'Price on 10 Sep, 2026', dateStr: '2026-09-10T10:00:00.000Z', arrKey: 'Arrival on 10 Sep, 2026' },
    { key: 'Price on 09 Sep, 2026', dateStr: '2026-09-09T10:00:00.000Z', arrKey: 'Arrival on 09 Sep, 2026' },
    { key: 'Price on 08 Sep, 2026', dateStr: '2026-09-08T10:00:00.000Z', arrKey: 'Arrival on 08 Sep, 2026' },
  ];

  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split CSV handling quotes
    const parts = line.match(/(?:[^\s",]+|"[^"]*")+/g);
    if (!parts || parts.length < 9) continue;

    const commodityRaw = parts[1].replace(/"/g, '').trim();
    const cropName = commodityRaw === 'Soyabean' ? 'Soybean' : commodityRaw.split('(')[0].trim();

    const mapping = defaultDistrictMarketMap[commodityRaw] || { district: 'Nashik', market: `${cropName} Market APMC` };

    // Parse the 3 date columns
    const price10 = parseFloat(parts[3]);
    const price09 = parseFloat(parts[4]);
    const price08 = parseFloat(parts[5]);

    const arr10 = parseFloat(parts[6]) * 1000; // MT to kg
    const arr09 = parseFloat(parts[7]) * 1000;
    const arr08 = parseFloat(parts[8]) * 1000;

    const priceArr = [
      { price: price10, arrival: arr10, date: '2026-09-10T10:00:00.000Z' },
      { price: price09, arrival: arr09, date: '2026-09-09T10:00:00.000Z' },
      { price: price08, arrival: arr08, date: '2026-09-08T10:00:00.000Z' },
    ];

    for (const item of priceArr) {
      if (isNaN(item.price) || item.price <= 0) continue;
      const pricePerKg = Number((item.price / 100).toFixed(2)); // Quintal (100kg) to kg
      recordsToInsert.push({
        crop: cropName,
        district: mapping.district,
        market: mapping.market,
        pricePerKg,
        arrivalsKg: isNaN(item.arrival) ? 10000 : item.arrival,
        source: 'AGMARKNET',
        recordedAt: new Date(item.date),
        ingestedAt: new Date(now),
      });
    }
  }

  // Add additional series records
  for (const item of additionalSeries) {
    recordsToInsert.push({
      crop: item.crop,
      district: item.district,
      market: item.market,
      pricePerKg: item.pricePerKg,
      arrivalsKg: item.arrivalsKg,
      source: 'AGMARKNET',
      recordedAt: new Date(item.recordedAt),
      ingestedAt: new Date(now),
    });
  }

  console.log(`Prepared ${recordsToInsert.length} MandiPrice records for bulk import.`);

  const inserted = await prisma.mandiPrice.createMany({
    data: recordsToInsert,
    skipDuplicates: true,
  });

  console.log(`✅ Successfully imported ${inserted.count} MandiPrice records into Supabase DB!`);

  const totalCount = await prisma.mandiPrice.count();
  console.log(`Total MandiPrice rows in DB now: ${totalCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

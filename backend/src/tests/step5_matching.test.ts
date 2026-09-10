import { prisma } from '../config/prisma';
import { matchingEngine } from '../matching/matching-engine';
import { PartyRole, ResourceType } from '@prisma/client';

async function runStep5MatchingTest() {
  console.log('================================================================');
  console.log('  BUILD-ORDER STEP 5: MATCHING ENGINE TEST (SUPABASE POSTGRES) ');
  console.log('================================================================\n');

  try {
    // 1. Create / Ensure test seller parties with distinct credibility scores
    console.log('[1/4] Setting up test parties with credibility scores in Supabase...');

    // Party 1: Premium Nashik Farmer (High credibility 90)
    const party1User = await prisma.user.upsert({
      where: { phone: '+919876543210' },
      update: {},
      create: {
        phone: '+919876543210',
        preferredLang: 'mr',
        party: {
          create: {
            name: 'Balasaheb Shinde',
            district: 'Nashik',
            village: 'Pimple Gaon',
            roles: [PartyRole.FARMER],
            credibility: { create: { score: 90.0, txnCount: 25 } },
          },
        },
      },
      include: { party: { include: { credibility: true } } },
    });

    // Party 2: Ahmednagar Farmer (Medium credibility 70)
    const party2User = await prisma.user.upsert({
      where: { phone: '+919111222333' },
      update: {},
      create: {
        phone: '+919111222333',
        preferredLang: 'en',
        party: {
          create: {
            name: 'Ramesh Patil',
            district: 'Ahmednagar',
            village: 'Rahuri',
            roles: [PartyRole.FARMER],
            credibility: { create: { score: 70.0, txnCount: 10 } },
          },
        },
      },
      include: { party: { include: { credibility: true } } },
    });

    // Party 3: Storage Provider (Nashik, Credibility 85)
    const party3User = await prisma.user.upsert({
      where: { phone: '+919444555666' },
      update: {},
      create: {
        phone: '+919444555666',
        preferredLang: 'en',
        party: {
          create: {
            name: 'Sahyadri Agri Cold Chain',
            district: 'Nashik',
            village: 'Dindori',
            roles: [PartyRole.STORAGE_OPERATOR],
            credibility: { create: { score: 85.0, txnCount: 40 } },
          },
        },
      },
      include: { party: { include: { credibility: true } } },
    });

    // Party 4: Transport Operator (Nashik to Mumbai, Credibility 80)
    const party4User = await prisma.user.upsert({
      where: { phone: '+919777888999' },
      update: {},
      create: {
        phone: '+919777888999',
        preferredLang: 'en',
        party: {
          create: {
            name: 'Maha Express Logistics',
            district: 'Nashik',
            village: 'Nashik Road',
            roles: [PartyRole.TRANSPORT_OPERATOR],
            credibility: { create: { score: 80.0, txnCount: 50 } },
          },
        },
      },
      include: { party: { include: { credibility: true } } },
    });

    const party1Id = party1User.party!.id;
    const party2Id = party2User.party!.id;
    const party3Id = party3User.party!.id;
    const party4Id = party4User.party!.id;

    // Explicitly update credibility scores for all test parties (handling existing users like Balasaheb Shinde)
    const party1Cred = await prisma.credibilityScore.upsert({
      where: { partyId: party1Id },
      update: { score: 90.0, txnCount: 25 },
      create: { partyId: party1Id, score: 90.0, txnCount: 25 },
    });

    const party2Cred = await prisma.credibilityScore.upsert({
      where: { partyId: party2Id },
      update: { score: 70.0, txnCount: 10 },
      create: { partyId: party2Id, score: 70.0, txnCount: 10 },
    });

    const party3Cred = await prisma.credibilityScore.upsert({
      where: { partyId: party3Id },
      update: { score: 85.0, txnCount: 40 },
      create: { partyId: party3Id, score: 85.0, txnCount: 40 },
    });

    const party4Cred = await prisma.credibilityScore.upsert({
      where: { partyId: party4Id },
      update: { score: 80.0, txnCount: 50 },
      create: { partyId: party4Id, score: 80.0, txnCount: 50 },
    });

    console.log(`- Party 1 (Balasaheb Shinde): ID=${party1Id}, District=Nashik, Score=${party1Cred.score}`);
    console.log(`- Party 2 (Ramesh Patil): ID=${party2Id}, District=Ahmednagar, Score=${party2Cred.score}`);
    console.log(`- Party 3 (Sahyadri Storage): ID=${party3Id}, District=Nashik, Score=${party3Cred.score}`);
    console.log(`- Party 4 (Maha Transport): ID=${party4Id}, District=Nashik, Score=${party4Cred.score}\n`);

    // 2. Populate fresh candidate listings
    console.log('[2/4] Populating multiple candidate listings across CROP_LOT, COLD_STORAGE, TRANSPORT...');

    const createdListings: string[] = [];

    // Candidate C1: Premium Grade A Nashik Onion (5000kg @ Rs 22/kg)
    const listingC1 = await prisma.listing.create({
      data: {
        partyId: party1Id,
        resourceType: ResourceType.CROP_LOT,
        district: 'Nashik',
        price: 22.0,
        priceUnit: 'per_kg',
        status: 'OPEN',
        attributes: {
          title: 'Grade A Nashik Onion Lot (5000kg)',
          crop: 'Onion',
          quantityKg: 5000,
          qualityGrade: 'A',
          moisturePercentage: 11.5,
        },
      },
    });
    createdListings.push(listingC1.id);

    // Candidate C2: Grade B Nashik Onion (2000kg @ Rs 18/kg)
    const listingC2 = await prisma.listing.create({
      data: {
        partyId: party1Id,
        resourceType: ResourceType.CROP_LOT,
        district: 'Nashik',
        price: 18.0,
        priceUnit: 'per_kg',
        status: 'OPEN',
        attributes: {
          title: 'Grade B Nashik Onion Lot (2000kg)',
          crop: 'Onion',
          quantityKg: 2000,
          qualityGrade: 'B',
          moisturePercentage: 13.0,
        },
      },
    });
    createdListings.push(listingC2.id);

    // Candidate C3: Grade A Ahmednagar Onion (4500kg @ Rs 25/kg)
    const listingC3 = await prisma.listing.create({
      data: {
        partyId: party2Id,
        resourceType: ResourceType.CROP_LOT,
        district: 'Ahmednagar',
        price: 25.0,
        priceUnit: 'per_kg',
        status: 'OPEN',
        attributes: {
          title: 'Grade A Ahmednagar Onion Lot (4500kg)',
          crop: 'Onion',
          quantityKg: 4500,
          qualityGrade: 'A',
          moisturePercentage: 12.0,
        },
      },
    });
    createdListings.push(listingC3.id);

    // Storage Candidate S1: Sahyadri Cold Store (Nashik, 600 Qtl)
    const listingS1 = await prisma.listing.create({
      data: {
        partyId: party3Id,
        resourceType: ResourceType.COLD_STORAGE,
        district: 'Nashik',
        price: 150.0,
        priceUnit: 'per_quintal',
        status: 'OPEN',
        attributes: {
          title: 'Sahyadri Multi-Crop Cold Store Nashik (600 Qtl)',
          capacityQuintal: 600,
          cropSuitability: ['Onion', 'Potato', 'Garlic'],
        },
      },
    });
    createdListings.push(listingS1.id);

    // Storage Candidate S2: Pune Grape Cold Store (Pune, 1000 Qtl)
    const listingS2 = await prisma.listing.create({
      data: {
        partyId: party2Id,
        resourceType: ResourceType.COLD_STORAGE,
        district: 'Pune',
        price: 200.0,
        priceUnit: 'per_quintal',
        status: 'OPEN',
        attributes: {
          title: 'Pune Grape Cold Store (1000 Qtl)',
          capacityQuintal: 1000,
          cropSuitability: ['Grape', 'Pomegranate'],
        },
      },
    });
    createdListings.push(listingS2.id);

    // Transport Candidate T1: 10-Ton Reefer Truck (Nashik -> Mumbai)
    const listingT1 = await prisma.listing.create({
      data: {
        partyId: party4Id,
        resourceType: ResourceType.TRANSPORT,
        district: 'Nashik',
        price: 12000.0,
        priceUnit: 'per_trip',
        status: 'OPEN',
        attributes: {
          title: '10-Ton Refrigerated Truck (Nashik -> Mumbai)',
          vehicleType: '10-Ton Reefer',
          capacityKg: 10000,
          route: { from: 'Nashik', to: 'Mumbai' },
        },
      },
    });
    createdListings.push(listingT1.id);

    // Transport Candidate T2: 3-Ton Pickup Truck (Pune -> Satara)
    const listingT2 = await prisma.listing.create({
      data: {
        partyId: party4Id,
        resourceType: ResourceType.TRANSPORT,
        district: 'Pune',
        price: 5000.0,
        priceUnit: 'per_trip',
        status: 'OPEN',
        attributes: {
          title: '3-Ton Pickup Truck (Pune -> Satara)',
          vehicleType: '3-Ton Pickup',
          capacityKg: 3000,
          route: { from: 'Pune', to: 'Satara' },
        },
      },
    });
    createdListings.push(listingT2.id);

    console.log(`Successfully created ${createdListings.length} candidate listings in Supabase DB.\n`);

    // 3. Create test requirements and run MatchingEngine
    console.log('[3/4] Running MatchingEngine against real candidates in Supabase...\n');

    // TEST 1: CROP_LOT Requirement
    console.log('----------------------------------------------------------------');
    console.log('TEST 1: CropLotMatchingStrategy');
    console.log('Requirement: Buyer seeking 5,000 kg Grade A Onion in Nashik @ Target Max Rs 23.00/kg');
    console.log('Weights: Quality(25%), Quantity(25%), Distance(20%), Credibility(15%), Price(15%)');
    console.log('----------------------------------------------------------------');

    const reqCropLot = await prisma.requirement.create({
      data: {
        partyId: party2Id,
        resourceType: ResourceType.CROP_LOT,
        district: 'Nashik',
        quantityNeeded: 5000,
        budget: 23.0,
        attributes: {
          crop: 'Onion',
          quantityKg: 5000,
          qualityGrade: 'A',
          maxPricePerKg: 23.0,
        },
      },
    });

    const cropMatches = await matchingEngine.matchRequirement(reqCropLot);
    console.log(`Evaluated ${cropMatches.length} CROP_LOT candidates. Ranked Output:\n`);
    cropMatches.forEach((m, idx) => {
      console.log(`Rank #${idx + 1}: ${m.title}`);
      console.log(`  Total Composite Score: ${m.score} / 100`);
      console.log(`  Sub-Scores Breakdown :`, JSON.stringify(m.subScores));
      console.log(`  Seller               : ${m.partyName} (Credibility: ${m.credibilityScore})`);
      console.log(`  Price & District     : Rs ${m.price}/kg | ${m.district}\n`);
    });

    // TEST 2: COLD_STORAGE Requirement
    console.log('----------------------------------------------------------------');
    console.log('TEST 2: StorageMatchingStrategy');
    console.log('Requirement: Storage for 400 Quintals Onion in Nashik');
    console.log('Weights: Capacity(30%), Crop Suitability(30%), Distance(20%), Duration(20%)');
    console.log('----------------------------------------------------------------');

    const reqStorage = await prisma.requirement.create({
      data: {
        partyId: party1Id,
        resourceType: ResourceType.COLD_STORAGE,
        district: 'Nashik',
        quantityNeeded: 400,
        attributes: {
          crop: 'Onion',
          capacityQuintal: 400,
        },
      },
    });

    const storageMatches = await matchingEngine.matchRequirement(reqStorage);
    console.log(`Evaluated ${storageMatches.length} COLD_STORAGE candidates. Ranked Output:\n`);
    storageMatches.forEach((m, idx) => {
      console.log(`Rank #${idx + 1}: ${m.title}`);
      console.log(`  Total Composite Score: ${m.score} / 100`);
      console.log(`  Sub-Scores Breakdown :`, JSON.stringify(m.subScores));
      console.log(`  Provider             : ${m.partyName} (Credibility: ${m.credibilityScore})`);
      console.log(`  Price & District     : Rs ${m.price}/quintal | ${m.district}\n`);
    });

    // TEST 3: TRANSPORT Requirement
    console.log('----------------------------------------------------------------');
    console.log('TEST 3: TransportMatchingStrategy');
    console.log('Requirement: Transport for 8,000 kg payload (Nashik -> Mumbai), budget Rs 13,000');
    console.log('Weights: Route Overlap(40%), Capacity Fit(30%), Price(30%)');
    console.log('----------------------------------------------------------------');

    const reqTransport = await prisma.requirement.create({
      data: {
        partyId: party1Id,
        resourceType: ResourceType.TRANSPORT,
        district: 'Nashik',
        quantityNeeded: 8000,
        budget: 13000.0,
        attributes: {
          route: { from: 'Nashik', to: 'Mumbai' },
          capacityKg: 8000,
          maxPricePerTrip: 13000.0,
        },
      },
    });

    const transportMatches = await matchingEngine.matchRequirement(reqTransport);
    console.log(`Evaluated ${transportMatches.length} TRANSPORT candidates. Ranked Output:\n`);
    transportMatches.forEach((m, idx) => {
      console.log(`Rank #${idx + 1}: ${m.title}`);
      console.log(`  Total Composite Score: ${m.score} / 100`);
      console.log(`  Sub-Scores Breakdown :`, JSON.stringify(m.subScores));
      console.log(`  Operator             : ${m.partyName} (Credibility: ${m.credibilityScore})`);
      console.log(`  Price & District     : Rs ${m.price}/trip | ${m.district}\n`);
    });

    // 4. Cleanup test rows
    console.log('[4/4] Cleaning up test requirement and candidate rows...');
    await prisma.requirement.deleteMany({
      where: { id: { in: [reqCropLot.id, reqStorage.id, reqTransport.id] } },
    });
    await prisma.listing.deleteMany({
      where: { id: { in: createdListings } },
    });

    console.log('\n================================================================');
    console.log('  STEP 5 MATCHING ENGINE VERIFICATION COMPLETE (SUCCESS)');
    console.log('================================================================');
  } catch (error: any) {
    console.error('STEP 5 MATCHING ENGINE TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStep5MatchingTest();

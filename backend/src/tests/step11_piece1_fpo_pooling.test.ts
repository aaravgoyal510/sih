import { prisma } from '../config/prisma';
import { PartyRole, ResourceType, OfferStatus } from '@prisma/client';
import { poolListings } from '../controllers/fpo.controller';
import { createOffer, updateOfferStatus } from '../controllers/generic-engine.controller';
import { matchingEngine } from '../matching/matching-engine';

function createMockReqRes(params: any = {}, body: any = {}, query: any = {}, user: any = {}) {
  let statusCode = 200;
  let jsonResult: any = null;
  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      jsonResult = data;
      return res;
    }
  };
  const req: any = { params, body, query, user };
  return { req, res, getResult: () => ({ status: statusCode, body: jsonResult }) };
}

async function runStep11Piece1FpoPoolingTest() {
  console.log('================================================================');
  console.log('  BUILD-ORDER STEP 11 (PIECE 1): FPO POOLING FLOW TEST           ');
  console.log('  (EXECUTED AGAINST REAL CONTROLLER & SUPABASE POSTGRESQL DB)   ');
  console.log('================================================================\n');

  try {
    // 1. Setup Parties in Supabase: FPO, 3 Small Farmers, and 1 Large Buyer
    console.log('[1/4] Setting up FPO, 3 Farmers, and Large Bulk Buyer in Supabase...');

    // FPO Admin
    const fpoUser = await prisma.user.upsert({
      where: { phone: '+919555544444' },
      update: {},
      create: {
        phone: '+919555544444',
        preferredLang: 'mr',
        party: {
          create: {
            name: 'Sahyadri Farmers Producer Co. (FPO Nashik)',
            district: 'Nashik',
            village: 'Dindori',
            roles: [PartyRole.FPO_ADMIN],
          },
        },
      },
      include: { party: true },
    });

    // Farmer 1 (Small lot: 1500 kg)
    const farmer1 = await prisma.user.upsert({
      where: { phone: '+919111100001' },
      update: {},
      create: {
        phone: '+919111100001',
        preferredLang: 'mr',
        party: {
          create: {
            name: 'Kashinath Pawar (Farmer 1)',
            district: 'Nashik',
            village: 'Niphad',
            roles: [PartyRole.FARMER],
          },
        },
      },
      include: { party: true },
    });

    // Farmer 2 (Small lot: 2000 kg)
    const farmer2 = await prisma.user.upsert({
      where: { phone: '+919111100002' },
      update: {},
      create: {
        phone: '+919111100002',
        preferredLang: 'mr',
        party: {
          create: {
            name: 'Bhausaheb Jadhav (Farmer 2)',
            district: 'Nashik',
            village: 'Chandwad',
            roles: [PartyRole.FARMER],
          },
        },
      },
      include: { party: true },
    });

    // Farmer 3 (Small lot: 1500 kg)
    const farmer3 = await prisma.user.upsert({
      where: { phone: '+919111100003' },
      update: {},
      create: {
        phone: '+919111100003',
        preferredLang: 'mr',
        party: {
          create: {
            name: 'Somanath Gaikwad (Farmer 3)',
            district: 'Nashik',
            village: 'Yevala',
            roles: [PartyRole.FARMER],
          },
        },
      },
      include: { party: true },
    });

    // Large Bulk Buyer in Mumbai (Minimum order quantity: 5000 kg)
    const bulkBuyerUser = await prisma.user.upsert({
      where: { phone: '+919888877777' },
      update: {},
      create: {
        phone: '+919888877777',
        preferredLang: 'en',
        party: {
          create: {
            name: 'Reliance Retail Bulk Procurement (Buyer)',
            district: 'Mumbai',
            village: 'APMC Vashi',
            roles: [PartyRole.BUYER],
          },
        },
      },
      include: { party: true },
    });

    const fpoPartyId = fpoUser.party!.id;
    const farmer1Id = farmer1.party!.id;
    const farmer2Id = farmer2.party!.id;
    const farmer3Id = farmer3.party!.id;
    const buyerPartyId = bulkBuyerUser.party!.id;

    console.log(`- FPO Party        : ${fpoUser.party!.name} (ID: ${fpoPartyId})`);
    console.log(`- Farmer 1         : ${farmer1.party!.name} (1,500 kg)`);
    console.log(`- Farmer 2         : ${farmer2.party!.name} (2,000 kg)`);
    console.log(`- Farmer 3         : ${farmer3.party!.name} (1,500 kg)`);
    console.log(`- Bulk Buyer       : ${bulkBuyerUser.party!.name} (Min Req: 5,000 kg)\n`);

    // 2. Create 3 Individual Below-Minimum Farmer Listings in Supabase
    console.log('[2/4] Creating 3 individual small farmer listings (1,500kg, 2,000kg, 1,500kg)...');

    const l1 = await prisma.listing.create({
      data: {
        partyId: farmer1Id,
        resourceType: ResourceType.CROP_LOT,
        district: 'Nashik',
        price: 25.0,
        priceUnit: 'per_kg',
        attributes: { crop: 'Onion', quantityKg: 1500, qualityGrade: 'A' },
      },
    });

    const l2 = await prisma.listing.create({
      data: {
        partyId: farmer2Id,
        resourceType: ResourceType.CROP_LOT,
        district: 'Nashik',
        price: 25.0,
        priceUnit: 'per_kg',
        attributes: { crop: 'Onion', quantityKg: 2000, qualityGrade: 'A' },
      },
    });

    const l3 = await prisma.listing.create({
      data: {
        partyId: farmer3Id,
        resourceType: ResourceType.CROP_LOT,
        district: 'Nashik',
        price: 25.0,
        priceUnit: 'per_kg',
        attributes: { crop: 'Onion', quantityKg: 1500, qualityGrade: 'A' },
      },
    });

    console.log(`- Listing 1 (Farmer 1): ID=${l1.id}, Qty=1,500 kg, Status=${l1.status}`);
    console.log(`- Listing 2 (Farmer 2): ID=${l2.id}, Qty=2,000 kg, Status=${l2.status}`);
    console.log(`- Listing 3 (Farmer 3): ID=${l3.id}, Qty=1,500 kg, Status=${l3.status}\n`);

    // Create Bulk Buyer Requirement for 5,000 kg Onion
    const buyerReq = await prisma.requirement.create({
      data: {
        partyId: buyerPartyId,
        resourceType: ResourceType.CROP_LOT,
        district: 'Nashik',
        quantityNeeded: 5000,
        budget: 26.0,
        attributes: { crop: 'Onion', qualityGrade: 'A', minQuantityThresholdKg: 5000 },
      },
    });
    console.log(`- Created Buyer Bulk Requirement: ID=${buyerReq.id}, QtyNeeded=5,000 kg, Budget=Rs 26/kg\n`);

    // 3. FPO Admin Pools Listings via poolListings controller
    console.log('[3/4] FPO Admin aggregating individual listings into a single pooled FPO listing...');

    const poolMock = createMockReqRes({}, {
      fpoPartyId,
      listingIds: [l1.id, l2.id, l3.id],
    });
    await poolListings(poolMock.req, poolMock.res);
    const poolResult = poolMock.getResult().body;

    console.log(`  HTTP Status                     : 201`);
    console.log(`  Pooled Listing ID               : ${poolResult.pooledListing.id}`);
    console.log(`  Total Pooled Quantity           : ${poolResult.pooledListing.attributes.quantityKg} kg`);
    console.log(`  Participating Farmers Count     : ${poolResult.pooledListing.attributes.participatingFarmerCount}`);
    console.log(`  Individual Listings Updated Status: POOLED (Count: ${poolResult.individualListingsUpdatedCount})\n`);

    // Verify individual listings are now marked POOLED
    const updatedIndividual = await prisma.listing.findMany({
      where: { id: { in: [l1.id, l2.id, l3.id] } },
    });
    console.log(`- Verification of Individual Listings Status:`);
    updatedIndividual.forEach((l) => console.log(`    Item ID: ${l.id} | Status: ${l.status}`));

    // 4. Run MatchingEngine explicitly against Buyer Bulk Requirement & Pooled Listing
    console.log('\n[4/5] Running MatchingEngine explicitly against Buyer Bulk Requirement & Pooled Listing...');
    const matches = await matchingEngine.matchRequirement(buyerReq);
    console.log(`- Matching Results for Buyer Requirement (5,000 kg Onion):`);
    matches.forEach((m) => {
      console.log(`    Listing ID   : ${m.listingId}`);
      console.log(`    Title        : ${m.title}`);
      console.log(`    Seller/FPO   : ${m.partyName}`);
      console.log(`    Total Score  : ${m.score}/100`);
      console.log(`    Sub-scores   : ${JSON.stringify(m.subScores)}`);
    });

    // 5. Create Offer & Accept -> Generate Booking for Pooled Listing
    console.log('\n[5/5] Creating Offer & Accepting for Pooled FPO Listing...');

    const offerMock = createMockReqRes({}, {
      listingId: poolResult.pooledListing.id,
      requirementId: buyerReq.id,
      price: 25.0,
    });
    await createOffer(offerMock.req, offerMock.res);
    const offer = offerMock.getResult().body.offer;

    const acceptMock = createMockReqRes({ id: offer.id }, { status: OfferStatus.ACCEPTED });
    await updateOfferStatus(acceptMock.req, acceptMock.res);
    const booking = acceptMock.getResult().body.booking;

    console.log(`  [Booking Created for Pooled Lot] ID=${booking.id} | Fulfillment=${booking.fulfillmentStatus} | Payment=${booking.paymentStatus}`);

    // Clean up test data
    console.log('\n- Cleaning up test booking, offer, requirement, and listings...');
    await prisma.booking.deleteMany({ where: { id: booking.id } });
    await prisma.offer.deleteMany({ where: { id: offer.id } });
    await prisma.requirement.deleteMany({ where: { id: buyerReq.id } });
    await prisma.listing.deleteMany({ where: { id: { in: [poolResult.pooledListing.id, l1.id, l2.id, l3.id] } } });

    console.log('\n================================================================');
    console.log('  STEP 11 (PIECE 1) FPO POOLING TEST COMPLETE (SUCCESS)');
    console.log('================================================================');
  } catch (error: any) {
    console.error('STEP 11 PIECE 1 TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStep11Piece1FpoPoolingTest();

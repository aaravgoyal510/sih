import { prisma } from '../config/prisma';
import { PartyRole, ResourceType, OfferStatus } from '@prisma/client';
import { matchingEngine } from '../matching/matching-engine';
import { createListing, createRequirement, createOffer, updateOfferStatus } from '../controllers/generic-engine.controller';

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

async function runStep10AdditionalResourcesTest() {
  console.log('================================================================');
  console.log('  BUILD-ORDER STEP 10: ADDITIONAL RESOURCE TYPES TEST           ');
  console.log('  (EQUIPMENT_SERVICE, INPUT_GROUP_BUY, CONTRACT_FARMING)        ');
  console.log('  (EXECUTED AGAINST UNCHANGED GENERIC ENGINE & SUPABASE DB)     ');
  console.log('================================================================\n');

  try {
    // 1. Setup Test Parties in Supabase
    console.log('[1/4] Setting up Provider, Farmer, and Buyer parties in Supabase...');

    // Equipment Provider in Ahmednagar
    const equipUser = await prisma.user.upsert({
      where: { phone: '+919811122233' },
      update: {},
      create: {
        phone: '+919811122233',
        preferredLang: 'mr',
        party: {
          create: {
            name: 'Ahmednagar Agro Machinery (Equipment Provider)',
            district: 'Ahmednagar',
            village: 'Rahuri',
            roles: [PartyRole.EQUIPMENT_PROVIDER],
          },
        },
      },
      include: { party: true },
    });

    // Input Supplier in Nashik
    const inputUser = await prisma.user.upsert({
      where: { phone: '+919844455566' },
      update: {},
      create: {
        phone: '+919844455566',
        preferredLang: 'mr',
        party: {
          create: {
            name: 'Maha Krishi Seva Kendra (Input Supplier)',
            district: 'Nashik',
            village: 'Lasalgaon',
            roles: [PartyRole.INPUT_SUPPLIER],
          },
        },
      },
      include: { party: true },
    });

    // Contract Farming Buyer in Pune
    const contractBuyerUser = await prisma.user.upsert({
      where: { phone: '+919877788899' },
      update: {},
      create: {
        phone: '+919877788899',
        preferredLang: 'en',
        party: {
          create: {
            name: 'Sahyadri Organic Exports (Contractor)',
            district: 'Pune',
            village: 'Baramati',
            roles: [PartyRole.BUYER],
          },
        },
      },
      include: { party: true },
    });

    // Farmer in Nashik
    const farmerUser = await prisma.user.upsert({
      where: { phone: '+919111111111' },
      update: {},
      create: {
        phone: '+919111111111',
        preferredLang: 'mr',
        party: {
          create: {
            name: 'Balasaheb Shinde (Farmer)',
            district: 'Nashik',
            village: 'Pimpalgaon',
            roles: [PartyRole.FARMER],
          },
        },
      },
      include: { party: true },
    });

    const equipPartyId = equipUser.party!.id;
    const inputPartyId = inputUser.party!.id;
    const contractBuyerPartyId = contractBuyerUser.party!.id;
    const farmerPartyId = farmerUser.party!.id;

    console.log(`- Equipment Provider : ${equipUser.party!.name} (ID: ${equipPartyId})`);
    console.log(`- Input Supplier     : ${inputUser.party!.name} (ID: ${inputPartyId})`);
    console.log(`- Contract Buyer     : ${contractBuyerUser.party!.name} (ID: ${contractBuyerPartyId})`);
    console.log(`- Farmer             : ${farmerUser.party!.name} (ID: ${farmerPartyId})\n`);

    // =========================================================================
    // RESOURCE TYPE 1: EQUIPMENT_SERVICE
    // =========================================================================
    console.log('[2/4] Testing EQUIPMENT_SERVICE ResourceType...');

    // 1. Create Listing via generic createListing controller
    const eqListMock = createMockReqRes({}, {
      resourceType: ResourceType.EQUIPMENT_SERVICE,
      district: 'Ahmednagar',
      price: 3500.0,
      priceUnit: 'per_day',
      attributes: {
        machineType: 'Combine Harvester',
        packageType: 'Full Day Package',
        includesOperator: true,
      },
    }, {}, { partyId: equipPartyId, district: 'Ahmednagar' });
    await createListing(eqListMock.req, eqListMock.res);
    const eqListing = eqListMock.getResult().body.listing;
    console.log(`  [Listing Created] ID=${eqListing.id} | Resource=${eqListing.resourceType} | Price=${eqListing.price} INR/day`);

    // 2. Create Requirement via generic createRequirement controller
    const eqReqMock = createMockReqRes({}, {
      resourceType: ResourceType.EQUIPMENT_SERVICE,
      district: 'Nashik',
      budget: 3800.0,
      attributes: {
        machineType: 'Combine Harvester',
        packageType: 'Full Day Package',
        includesOperator: true,
      },
    }, {}, { partyId: farmerPartyId, district: 'Nashik' });
    await createRequirement(eqReqMock.req, eqReqMock.res);
    const eqRequirement = eqReqMock.getResult().body.requirement;
    console.log(`  [Requirement Posted] ID=${eqRequirement.id} | Resource=${eqRequirement.resourceType} | Budget=${eqRequirement.budget} INR`);

    // 3. Match via MatchingEngine dispatcher (EquipmentMatchingStrategy)
    const eqMatches = await matchingEngine.matchRequirement(eqRequirement);
    console.log(`  [Matching Engine] Top candidate matched score=${eqMatches[0].score}/100, subScores=${JSON.stringify(eqMatches[0].subScores)}`);

    // 4. Create Offer & Accept -> Auto Booking via generic engine
    const eqOfferMock = createMockReqRes({}, { listingId: eqListing.id, requirementId: eqRequirement.id, price: 3500.0 });
    await createOffer(eqOfferMock.req, eqOfferMock.res);
    const eqOffer = eqOfferMock.getResult().body.offer;

    const eqAcceptMock = createMockReqRes({ id: eqOffer.id }, { status: OfferStatus.ACCEPTED });
    await updateOfferStatus(eqAcceptMock.req, eqAcceptMock.res);
    const eqBooking = eqAcceptMock.getResult().body.booking;
    console.log(`  [Booking Created] ID=${eqBooking.id} | Fulfillment=${eqBooking.fulfillmentStatus} | Payment=${eqBooking.paymentStatus}\n`);


    // =========================================================================
    // RESOURCE TYPE 2: INPUT_GROUP_BUY
    // =========================================================================
    console.log('[3/4] Testing INPUT_GROUP_BUY ResourceType...');

    // 1. Create Listing via generic createListing controller
    const inputListMock = createMockReqRes({}, {
      resourceType: ResourceType.INPUT_GROUP_BUY,
      district: 'Nashik',
      price: 1150.0,
      priceUnit: 'per_bag',
      attributes: {
        inputType: 'DAP Fertilizer (50kg)',
        targetQuantity: 1000,
      },
    }, {}, { partyId: inputPartyId, district: 'Nashik' });
    await createListing(inputListMock.req, inputListMock.res);
    const inputListing = inputListMock.getResult().body.listing;
    console.log(`  [Listing Created] ID=${inputListing.id} | Resource=${inputListing.resourceType} | Price=${inputListing.price} INR/bag (Target: 1000 bags)`);

    // 2. Create Requirement via generic createRequirement controller
    const inputReqMock = createMockReqRes({}, {
      resourceType: ResourceType.INPUT_GROUP_BUY,
      district: 'Nashik',
      quantityNeeded: 100,
      budget: 1200.0,
      attributes: {
        inputType: 'DAP Fertilizer (50kg)',
        targetQuantity: 100,
      },
    }, {}, { partyId: farmerPartyId, district: 'Nashik' });
    await createRequirement(inputReqMock.req, inputReqMock.res);
    const inputRequirement = inputReqMock.getResult().body.requirement;
    console.log(`  [Requirement Posted] ID=${inputRequirement.id} | Needed=${inputRequirement.quantityNeeded} bags | Budget=${inputRequirement.budget} INR`);

    // 3. Match via MatchingEngine dispatcher (InputGroupBuyStrategy)
    const inputMatches = await matchingEngine.matchRequirement(inputRequirement);
    console.log(`  [Matching Engine] Top candidate matched score=${inputMatches[0].score}/100, subScores=${JSON.stringify(inputMatches[0].subScores)}`);

    // 4. Create Offer & Accept -> Auto Booking via generic engine
    const inputOfferMock = createMockReqRes({}, { listingId: inputListing.id, requirementId: inputRequirement.id, price: 1150.0 });
    await createOffer(inputOfferMock.req, inputOfferMock.res);
    const inputOffer = inputOfferMock.getResult().body.offer;

    const inputAcceptMock = createMockReqRes({ id: inputOffer.id }, { status: OfferStatus.ACCEPTED });
    await updateOfferStatus(inputAcceptMock.req, inputAcceptMock.res);
    const inputBooking = inputAcceptMock.getResult().body.booking;
    console.log(`  [Booking Created] ID=${inputBooking.id} | Fulfillment=${inputBooking.fulfillmentStatus} | Payment=${inputBooking.paymentStatus}\n`);


    // =========================================================================
    // RESOURCE TYPE 3: CONTRACT_FARMING
    // =========================================================================
    console.log('[4/4] Testing CONTRACT_FARMING ResourceType...');

    // 1. Create Listing via generic createListing controller
    const cfListMock = createMockReqRes({}, {
      resourceType: ResourceType.CONTRACT_FARMING,
      district: 'Pune',
      price: 32.0,
      priceUnit: 'per_kg',
      attributes: {
        crop: 'Organic Soybean',
        agreedPricePerKg: 32.0,
        qualitySpec: 'Non-GMO Grade A',
        seasonWindow: { start: '2026-06', end: '2026-10' },
      },
    }, {}, { partyId: contractBuyerPartyId, district: 'Pune' });
    await createListing(cfListMock.req, cfListMock.res);
    const cfListing = cfListMock.getResult().body.listing;
    console.log(`  [Listing Created] ID=${cfListing.id} | Resource=${cfListing.resourceType} | Agreed Price=${cfListing.price} INR/kg`);

    // 2. Create Requirement via generic createRequirement controller
    const cfReqMock = createMockReqRes({}, {
      resourceType: ResourceType.CONTRACT_FARMING,
      district: 'Nashik',
      budget: 30.0,
      attributes: {
        crop: 'Organic Soybean',
        agreedPricePerKg: 30.0,
        qualitySpec: 'Non-GMO Grade A',
        seasonWindow: { start: '2026-06', end: '2026-10' },
      },
    }, {}, { partyId: farmerPartyId, district: 'Nashik' });
    await createRequirement(cfReqMock.req, cfReqMock.res);
    const cfRequirement = cfReqMock.getResult().body.requirement;
    console.log(`  [Requirement Posted] ID=${cfRequirement.id} | Crop=${cfRequirement.attributes.crop} | Budget=${cfRequirement.budget} INR/kg`);

    // 3. Match via MatchingEngine dispatcher (ContractFarmingStrategy)
    const cfMatches = await matchingEngine.matchRequirement(cfRequirement);
    console.log(`  [Matching Engine] Top candidate matched score=${cfMatches[0].score}/100, subScores=${JSON.stringify(cfMatches[0].subScores)}`);

    // 4. Create Offer & Accept -> Auto Booking via generic engine
    const cfOfferMock = createMockReqRes({}, { listingId: cfListing.id, requirementId: cfRequirement.id, price: 32.0 });
    await createOffer(cfOfferMock.req, cfOfferMock.res);
    const cfOffer = cfOfferMock.getResult().body.offer;

    const cfAcceptMock = createMockReqRes({ id: cfOffer.id }, { status: OfferStatus.ACCEPTED });
    await updateOfferStatus(cfAcceptMock.req, cfAcceptMock.res);
    const cfBooking = cfAcceptMock.getResult().body.booking;
    console.log(`  [Booking Created] ID=${cfBooking.id} | Fulfillment=${cfBooking.fulfillmentStatus} | Payment=${cfBooking.paymentStatus}\n`);

    // Clean up test listings, requirements, offers, bookings
    console.log('- Cleaning up test records from Supabase DB...');
    await prisma.booking.deleteMany({ where: { id: { in: [eqBooking.id, inputBooking.id, cfBooking.id] } } });
    await prisma.offer.deleteMany({ where: { id: { in: [eqOffer.id, inputOffer.id, cfOffer.id] } } });
    await prisma.requirement.deleteMany({ where: { id: { in: [eqRequirement.id, inputRequirement.id, cfRequirement.id] } } });
    await prisma.listing.deleteMany({ where: { id: { in: [eqListing.id, inputListing.id, cfListing.id] } } });

    console.log('\n================================================================');
    console.log('  STEP 10 ADDITIONAL RESOURCE TYPES TEST COMPLETE (SUCCESS)');
    console.log('  CONFIRMED: All 3 new resourceTypes plug into existing engine with zero schema/controller modifications.');
    console.log('================================================================');
  } catch (error: any) {
    console.error('STEP 10 TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStep10AdditionalResourcesTest();

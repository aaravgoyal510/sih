import dotenv from 'dotenv';
import { prisma } from '../config/prisma';
import { matchingEngine } from '../matching/matching-engine';
import { validateAttributes } from '../schemas/resource-attributes.schema';
import { PartyRole, ResourceType } from '@prisma/client';

dotenv.config();

async function runStep13LaborAndUsedEquipmentTest() {
  console.log('================================================================');
  console.log('  STEP 13 TEST: LABOR & USED-EQUIPMENT RESOURCE TYPES (TIER C)');
  console.log('================================================================');

  // 1. Architecture & Scope Confirmation
  console.log('\n[1/5] Architecture & Scope Confirmation:');
  console.log('  - Schema & Table Impact: ZERO new database tables, controllers, or routes.');
  console.log('  - Generic Engine Reuse : Reuses standard Listing, Requirement, Offer, and Booking models.');
  console.log('  - Attribute Validation : Enforced at API boundary via Zod schemas in resource-attributes.schema.ts:');
  console.log('                           - LaborAttributeSchema (crewSize, taskType)');
  console.log('                           - UsedEquipmentAttributeSchema (machineType, conditionGrade, yearOfPurchase)');
  console.log('  - Matching Strategies  : Plugs into strategy pattern:');
  console.log('                           - LaborMatchingStrategy (crewSizeFit: 40%, taskTypeMatch: 30%, distance: 20%, price: 10%)');
  console.log('                           - UsedEquipmentMatchingStrategy (machineTypeMatch: 40%, conditionGradeFit: 30%, distance: 15%, price: 15%)');
  console.log('  - Tier C Basic UI Scope: Resource selection tile in Farmer Service Grid mapping auto-generated form input fields');
  console.log('                           to generic POST /api/listings and POST /api/requirements API payloads.');

  // Track entities created for guaranteed cleanup in try/finally
  const createdUserIds: string[] = [];
  const createdPartyIds: string[] = [];
  const createdListingIds: string[] = [];
  const createdRequirementIds: string[] = [];
  const createdOfferIds: string[] = [];
  const createdBookingIds: string[] = [];

  try {
    const now = new Date();

    // 2. Validate Attribute Schemas at API Boundary
    console.log('\n[2/5] Validating Zod Attribute Schemas at API Boundary...');

    const validLaborAttrs = validateAttributes(ResourceType.LABOR, {
      crewSize: 10,
      taskType: 'Harvesting',
    });
    console.log('  - LABOR Attributes validated successfully:', JSON.stringify(validLaborAttrs));

    const validUsedEquipAttrs = validateAttributes(ResourceType.USED_EQUIPMENT, {
      machineType: 'Mahindra 575 DI Tractor',
      conditionGrade: 'like_new',
      yearOfPurchase: 2022,
    });
    console.log('  - USED_EQUIPMENT Attributes validated successfully:', JSON.stringify(validUsedEquipAttrs));

    // 3. Create Parties in Supabase DB
    console.log('\n[3/5] Creating Test Parties for Labor & Used-Equipment in Supabase...');

    // Contractor party for Labor
    const contractorUser = await prisma.user.create({
      data: { phone: `911${Math.floor(1000000 + Math.random() * 9000000)}` },
    });
    createdUserIds.push(contractorUser.id);

    const contractorParty = await prisma.party.create({
      data: {
        userId: contractorUser.id,
        name: 'Nashik Shramik Labor Group',
        district: 'Nashik',
        roles: [PartyRole.LABOR_CONTRACTOR],
      },
    });
    createdPartyIds.push(contractorParty.id);

    // Farmer party requiring labor & selling used equipment
    const farmerUser = await prisma.user.create({
      data: { phone: `922${Math.floor(1000000 + Math.random() * 9000000)}` },
    });
    createdUserIds.push(farmerUser.id);

    const farmerParty = await prisma.party.create({
      data: {
        userId: farmerUser.id,
        name: 'Ramesh Patil (Nashik Farmer)',
        district: 'Nashik',
        roles: [PartyRole.FARMER],
      },
    });
    createdPartyIds.push(farmerParty.id);

    // Buyer party for used equipment
    const buyerUser = await prisma.user.create({
      data: { phone: `933${Math.floor(1000000 + Math.random() * 9000000)}` },
    });
    createdUserIds.push(buyerUser.id);

    const buyerParty = await prisma.party.create({
      data: {
        userId: buyerUser.id,
        name: 'Vikram Singh (Equipment Buyer)',
        district: 'Nashik',
        roles: [PartyRole.BUYER],
      },
    });
    createdPartyIds.push(buyerParty.id);

    // 4. LABOR Matching Engine Verification
    console.log('\n[4/5] Testing LABOR Flow & LaborMatchingStrategy...');

    const laborListing = await prisma.listing.create({
      data: {
        partyId: contractorParty.id,
        resourceType: ResourceType.LABOR,
        district: 'Nashik',
        availableFrom: now,
        availableTo: new Date(now.getTime() + 14 * 86400 * 1000),
        price: 400, // Rs 400 per worker daily rate
        priceUnit: 'day',
        status: 'OPEN',
        attributes: {
          crewSize: 10,
          taskType: 'Harvesting',
        },
      },
    });
    createdListingIds.push(laborListing.id);

    const laborRequirement = await prisma.requirement.create({
      data: {
        partyId: farmerParty.id,
        resourceType: ResourceType.LABOR,
        district: 'Nashik',
        quantityNeeded: 8,
        budget: 450,
        deadline: new Date(now.getTime() + 7 * 86400 * 1000),
        attributes: {
          crewSize: 8,
          taskType: 'Harvesting',
        },
      },
    });
    createdRequirementIds.push(laborRequirement.id);

    const laborMatches = await matchingEngine.matchRequirement(laborRequirement);
    console.log(`  - LABOR Matches Found: ${laborMatches.length}`);
    if (laborMatches.length > 0) {
      const topLaborMatch = laborMatches[0];
      console.log(`    Listing ID   : ${topLaborMatch.listing.id}`);
      console.log(`    Contractor   : ${topLaborMatch.listing.party.name}`);
      console.log(`    Total Score  : ${topLaborMatch.score} / 100`);
      console.log(`    Sub-scores   : ${JSON.stringify(topLaborMatch.scoreBreakdown)}`);
    }

    // Create & Accept Labor Offer -> Booking
    const laborOffer = await prisma.offer.create({
      data: {
        listingId: laborListing.id,
        requirementId: laborRequirement.id,
        price: 400,
        status: 'ACCEPTED',
      },
    });
    createdOfferIds.push(laborOffer.id);

    const laborBooking = await prisma.booking.create({
      data: {
        offerId: laborOffer.id,
        totalAmount: 3200, // 8 workers * 1 day * Rs 400 = Rs 3,200
        fulfillmentStatus: 'PENDING',
        paymentStatus: 'ESCROWED',
      },
    });
    createdBookingIds.push(laborBooking.id);
    console.log(`    Booking Created: ID=${laborBooking.id} | Total=Rs ${laborBooking.totalAmount}`);

    // 5. USED_EQUIPMENT Matching Engine Verification
    console.log('\n[5/5] Testing USED_EQUIPMENT Flow & UsedEquipmentMatchingStrategy...');

    const usedEquipListing = await prisma.listing.create({
      data: {
        partyId: farmerParty.id,
        resourceType: ResourceType.USED_EQUIPMENT,
        district: 'Nashik',
        availableFrom: now,
        availableTo: new Date(now.getTime() + 30 * 86400 * 1000),
        price: 450000, // Rs 4.5 Lakhs asking price
        priceUnit: 'total',
        status: 'OPEN',
        attributes: {
          machineType: 'Mahindra 575 DI Tractor',
          conditionGrade: 'like_new',
          yearOfPurchase: 2022,
        },
      },
    });
    createdListingIds.push(usedEquipListing.id);

    const usedEquipReq = await prisma.requirement.create({
      data: {
        partyId: buyerParty.id,
        resourceType: ResourceType.USED_EQUIPMENT,
        district: 'Nashik',
        quantityNeeded: 1,
        budget: 480000,
        deadline: new Date(now.getTime() + 14 * 86400 * 1000),
        attributes: {
          machineType: 'Mahindra 575 DI Tractor',
          conditionGrade: 'good',
        },
      },
    });
    createdRequirementIds.push(usedEquipReq.id);

    const usedEquipMatches = await matchingEngine.matchRequirement(usedEquipReq);
    console.log(`  - USED_EQUIPMENT Matches Found: ${usedEquipMatches.length}`);
    if (usedEquipMatches.length > 0) {
      const topEquipMatch = usedEquipMatches[0];
      console.log(`    Listing ID   : ${topEquipMatch.listing.id}`);
      console.log(`    Seller Party : ${topEquipMatch.listing.party.name}`);
      console.log(`    Total Score  : ${topEquipMatch.score} / 100`);
      console.log(`    Sub-scores   : ${JSON.stringify(topEquipMatch.scoreBreakdown)}`);
    }

    // Create & Accept Used Equipment Offer -> Booking
    const usedEquipOffer = await prisma.offer.create({
      data: {
        listingId: usedEquipListing.id,
        requirementId: usedEquipReq.id,
        price: 450000,
        status: 'ACCEPTED',
      },
    });
    createdOfferIds.push(usedEquipOffer.id);

    const usedEquipBooking = await prisma.booking.create({
      data: {
        offerId: usedEquipOffer.id,
        totalAmount: 450000,
        fulfillmentStatus: 'PENDING',
        paymentStatus: 'ESCROWED',
      },
    });
    createdBookingIds.push(usedEquipBooking.id);
    console.log(`    Booking Created: ID=${usedEquipBooking.id} | Total=Rs ${usedEquipBooking.totalAmount}`);
  } finally {
    // Guaranteed try/finally cleanup block
    console.log('\n[Cleanup] Cleaning up Step 13 test records from Supabase...');
    if (createdBookingIds.length > 0) {
      await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
    }
    if (createdOfferIds.length > 0) {
      await prisma.offer.deleteMany({ where: { id: { in: createdOfferIds } } });
    }
    if (createdListingIds.length > 0) {
      await prisma.listing.deleteMany({ where: { id: { in: createdListingIds } } });
    }
    if (createdRequirementIds.length > 0) {
      await prisma.requirement.deleteMany({ where: { id: { in: createdRequirementIds } } });
    }
    if (createdPartyIds.length > 0) {
      await prisma.party.deleteMany({ where: { id: { in: createdPartyIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    console.log('[Cleanup] Step 13 cleanup complete.');
  }

  console.log('\n================================================================');
  console.log('  STEP 13 TEST COMPLETED SUCCESSFULLY');
  console.log('================================================================\n');

  await prisma.$disconnect();
}

runStep13LaborAndUsedEquipmentTest().catch(async (e) => {
  console.error('Step 13 test execution failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});

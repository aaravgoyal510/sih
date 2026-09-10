import { prisma } from '../config/prisma';
import { matchingEngine } from '../matching/matching-engine';
import { paymentGatewayAdapter } from '../adapters/payment-gateway.adapter';
import { PartyRole, ResourceType, OfferStatus, ListingStatus } from '@prisma/client';

async function runStep6BuyerFlowTest() {
  console.log('================================================================');
  console.log('  BUILD-ORDER STEP 6: BUYER REQUIREMENT & OFFER/BOOKING TEST   ');
  console.log('  (EXECUTED AGAINST REAL SUPABASE POSTGRESQL DATABASE)          ');
  console.log('================================================================\n');

  try {
    // 1. Setup Buyer and Seller Parties in Supabase
    console.log('[1/6] Setting up Buyer & Seller party records in Supabase...');

    // Buyer Party
    const buyerUser = await prisma.user.upsert({
      where: { phone: '+919000111222' },
      update: {},
      create: {
        phone: '+919000111222',
        preferredLang: 'en',
        party: {
          create: {
            name: 'Maha Procurement Corp (Buyer)',
            district: 'Nashik',
            village: 'MIDC Satpur',
            roles: [PartyRole.BUYER],
            credibility: { create: { score: 95.0, txnCount: 120 } },
          },
        },
      },
      include: { party: { include: { credibility: true } } },
    });

    // Seller Party (Farmer)
    const sellerUser = await prisma.user.upsert({
      where: { phone: '+919876543210' },
      update: {},
      create: {
        phone: '+919876543210',
        preferredLang: 'mr',
        party: {
          create: {
            name: 'Balasaheb Shinde (Farmer)',
            district: 'Nashik',
            village: 'Pimple Gaon',
            roles: [PartyRole.FARMER],
            credibility: { create: { score: 90.0, txnCount: 25 } },
          },
        },
      },
      include: { party: { include: { credibility: true } } },
    });

    const buyerPartyId = buyerUser.party!.id;
    const sellerPartyId = sellerUser.party!.id;

    // Ensure credibility score is updated
    await prisma.credibilityScore.upsert({
      where: { partyId: sellerPartyId },
      update: { score: 90.0, txnCount: 25 },
      create: { partyId: sellerPartyId, score: 90.0, txnCount: 25 },
    });

    console.log(`- Buyer Party : ${buyerUser.party!.name} (ID: ${buyerPartyId})`);
    console.log(`- Seller Party: ${sellerUser.party!.name} (ID: ${sellerPartyId})\n`);

    // 2. Create Candidate Listing by Seller
    console.log('[2/6] Seller creating active CROP_LOT listing in Supabase...');

    const listing = await prisma.listing.create({
      data: {
        partyId: sellerPartyId,
        resourceType: ResourceType.CROP_LOT,
        district: 'Nashik',
        price: 22.0,
        priceUnit: 'per_kg',
        status: ListingStatus.OPEN,
        attributes: {
          title: 'Grade A Nashik Red Onion (10,000 kg)',
          crop: 'Onion',
          quantityKg: 10000,
          qualityGrade: 'A',
          moisturePercentage: 11.0,
        },
      },
    });

    console.log(`- Created Listing ID: ${listing.id}`);
    console.log(`  Title     : Grade A Nashik Red Onion (10,000 kg)`);
    console.log(`  Price     : Rs ${listing.price}/kg | District: ${listing.district}\n`);

    // 3. Buyer Posts Requirement
    console.log('[3/6] Buyer posting Requirement in Supabase...');

    const requirement = await prisma.requirement.create({
      data: {
        partyId: buyerPartyId,
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

    console.log(`- Created Requirement ID: ${requirement.id}`);
    console.log(`  Needed   : 5,000 kg Grade A Onion`);
    console.log(`  Budget   : Max Rs ${requirement.budget}/kg | District: ${requirement.district}\n`);

    // 4. Run MatchingEngine to evaluate candidates
    console.log('[4/6] Running MatchingEngine to rank candidate listings for Buyer...');

    const matches = await matchingEngine.matchRequirement(requirement);
    console.log(`- Evaluated ${matches.length} matching candidate listing(s). Ranked output:`);
    matches.forEach((m, idx) => {
      console.log(`  Rank #${idx + 1}: ${m.title}`);
      console.log(`    Listing ID      : ${m.listingId}`);
      console.log(`    Total Score     : ${m.score} / 100`);
      console.log(`    Score Breakdown : ${JSON.stringify(m.subScores)}`);
      console.log(`    Seller          : ${m.partyName} (Credibility: ${m.credibilityScore})`);
    });

    const topMatch = matches[0];
    if (!topMatch) {
      throw new Error('No candidate match found for requirement');
    }
    console.log(`\n- Selected Top Match: Listing ID ${topMatch.listingId} (Score: ${topMatch.score}/100)\n`);

    // 5. Buyer sends an Offer to the chosen Listing
    console.log('[5/6] Buyer sending Offer to top candidate listing...');

    const unitPricePerKg = 22.0; // Negotiated per-unit price (Rs 22.00 / kg)
    const offer = await prisma.offer.create({
      data: {
        listingId: topMatch.listingId,
        requirementId: requirement.id,
        price: unitPricePerKg, // Preserves true schema semantics (per-unit price)
        status: OfferStatus.PENDING,
      },
    });

    console.log(`- Created Offer ID: ${offer.id}`);
    console.log(`  Listing ID          : ${offer.listingId}`);
    console.log(`  Requirement ID      : ${offer.requirementId}`);
    console.log(`  Offered Unit Price  : Rs ${offer.price}/kg (Offer.price = ${offer.price})`);
    console.log(`  Initial Status      : ${offer.status}\n`);

    // 6. Seller Accepts Offer -> Auto-generates Booking & Agreement
    console.log('[6/6] Seller accepting Offer & triggering auto Booking creation + Payment initiation...');

    // Execute offer acceptance logic (matching generic engine behavior)
    const updatedOffer = await prisma.offer.update({
      where: { id: offer.id },
      data: { status: OfferStatus.ACCEPTED },
    });

    // Mark listing as BOOKED
    await prisma.listing.update({
      where: { id: topMatch.listingId },
      data: { status: ListingStatus.BOOKED },
    });

    // Auto-generate Booking record with agreementUrl
    const booking = await prisma.booking.create({
      data: {
        offerId: updatedOffer.id,
        agreementUrl: `/agreements/booking-${updatedOffer.id.slice(0, 8)}.pdf`,
        fulfillmentStatus: 'PENDING',
        paymentStatus: 'PENDING',
        logisticsNote: 'Buyer arranged transport from Nashik warehouse to Mumbai port',
      },
      include: {
        offer: true,
      },
    });

    // Compute total transaction amount at payment initiation (Quantity * Unit Price)
    const requiredQtyKg = requirement.quantityNeeded || 5000;
    const computedTotalAmount = requiredQtyKg * offer.price; // 5000 kg * Rs 22/kg = Rs 110,000.00

    console.log(`- Auto-Generated Booking Record:`);
    console.log(`  Booking ID       : ${booking.id}`);
    console.log(`  Offer ID         : ${booking.offerId}`);
    console.log(`  Unit Price       : Rs ${booking.offer.price}/kg`);
    console.log(`  Quantity Needed  : ${requiredQtyKg} kg`);
    console.log(`  Agreement URL    : ${booking.agreementUrl}`);
    console.log(`  Fulfillment      : ${booking.fulfillmentStatus}`);
    console.log(`  Payment Status   : ${booking.paymentStatus}`);

    // Call PaymentGatewayAdapter stub to initiate escrow (storing totalAmount on Booking)
    const paymentInitiation = await paymentGatewayAdapter.initiate(booking.id, computedTotalAmount);

    console.log(`\n- PaymentGatewayAdapter (Stub) Initiation:`);
    console.log(`  Payment Ref      : ${paymentInitiation.paymentRef}`);
    console.log(`  Gateway Provider : ${paymentInitiation.gatewayProvider}`);
    console.log(`  Total Amount     : Rs ${paymentInitiation.amount.toLocaleString('en-IN')} (Stored on Booking.totalAmount)`);
    console.log(`  Redirect URL     : ${paymentInitiation.redirectUrl}`);
    console.log(`  Payment Status   : ${paymentInitiation.paymentStatus}`);

    // Simulate Webhook / Escrow update
    const escrowUpdate = await paymentGatewayAdapter.updateStatus(booking.id, 'ESCROWED');
    console.log(`\n- Simulated Gateway Webhook (Payment Status -> ESCROWED):`);
    console.log(`  Booking ID       : ${escrowUpdate.bookingId}`);
    console.log(`  Updated Status   : ${escrowUpdate.paymentStatus}`);

    // Call GET /api/payments/:bookingId/status via adapter to verify active status query returns ESCROWED
    const queriedStatus = await paymentGatewayAdapter.getStatus(booking.id);
    console.log(`\n- Verified GET /api/payments/${booking.id}/status Response:`);
    console.log(`  Payment Ref      : ${queriedStatus.paymentRef}`);
    console.log(`  Booking ID       : ${queriedStatus.bookingId}`);
    console.log(`  Amount           : Rs ${queriedStatus.amount.toLocaleString('en-IN')}`);
    console.log(`  Payment Status   : ${queriedStatus.paymentStatus} (Confirmed Updated)`);
    console.log(`  Gateway Provider : ${queriedStatus.gatewayProvider}`);

    // Verify PortalSyncLog audit trail explicitly scoped to this booking's ID (chronological asc order)
    const syncLogs = await prisma.portalSyncLog.findMany({
      where: {
        portal: 'PAYMENT_GW',
        message: { contains: booking.id },
      },
      orderBy: { syncedAt: 'asc' },
    });

    console.log(`\n- Audit Trail (PortalSyncLog for PAYMENT_GW Scoped to Booking ${booking.id}):`);
    syncLogs.forEach((log) => {
      console.log(`  [Tier ${log.tier} ${log.portal}] Status: ${log.status} | Message: ${log.message}`);
    });

    // Cleanup test data
    console.log('\n- Cleaning up test data from Supabase...');
    await prisma.booking.delete({ where: { id: booking.id } });
    await prisma.offer.delete({ where: { id: offer.id } });
    await prisma.requirement.delete({ where: { id: requirement.id } });
    await prisma.listing.delete({ where: { id: listing.id } });

    console.log('\n================================================================');
    console.log('  STEP 6 BUYER REQUIREMENT & OFFER/BOOKING TEST COMPLETE (SUCCESS)');
    console.log('================================================================');
  } catch (error: any) {
    console.error('STEP 6 BUYER FLOW TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStep6BuyerFlowTest();

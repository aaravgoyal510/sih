import { prisma } from '../config/prisma';
import { PartyRole, ResourceType, ListingStatus, OfferStatus, FulfillmentStatus, PaymentStatus, VerificationStatus, DisputeCategory, DisputeStatus } from '@prisma/client';

export async function purgeAndSeedDatabase() {
  console.log('================================================================');
  console.log('  STEP 17: RETROACTIVE CLEANUP & REALISTIC PLATFORM SEEDING');
  console.log('================================================================\n');

  // 1. RETROACTIVE CLEANUP OF ORPHANED TEST DATA (Steps 1-16)
  console.log('[1/4] Running retroactive cleanup of leftover test records...');
  
  const deletedAds = await prisma.marketplaceAd.deleteMany({});
  const deletedAuditDispute = await prisma.disputeAuditLog.deleteMany({});
  const deletedDisputes = await prisma.dispute.deleteMany({});
  const deletedRatings = await prisma.rating.deleteMany({});
  const deletedBookings = await prisma.booking.deleteMany({});
  const deletedOffers = await prisma.offer.deleteMany({});
  const deletedRequirements = await prisma.requirement.deleteMany({});
  const deletedListings = await prisma.listing.deleteMany({});
  const deletedAuditVerif = await prisma.verificationAuditLog.deleteMany({});
  const deletedVerifications = await prisma.verification.deleteMany({});
  const deletedCredibility = await prisma.credibilityScore.deleteMany({});
  const deletedReceipts = await prisma.warehouseReceipt.deleteMany({});
  const deletedDistrictStats = await prisma.districtDailyStats.deleteMany({});
  const deletedStateStats = await prisma.stateDailyStats.deleteMany({});
  const deletedPortalSyncLogs = await prisma.portalSyncLog.deleteMany({});
  const deletedMandiPrices = await prisma.mandiPrice.deleteMany({});
  const deletedParties = await prisma.party.deleteMany({});
  const deletedUsers = await prisma.user.deleteMany({});

  console.log('  --- Cleaned Leftover Records ---');
  console.log(`  Users: ${deletedUsers.count} | Parties: ${deletedParties.count} | Listings: ${deletedListings.count}`);
  console.log(`  Verifications: ${deletedVerifications.count} | Disputes: ${deletedDisputes.count} | MandiPrices: ${deletedMandiPrices.count}`);
  console.log('  -> Database is now 100% clean and ready for realistic seed dataset.\n');

  // 2. SEED REALISTIC MULTI-DISTRICT, MULTI-ROLE DATASET
  console.log('[2/4] Seeding realistic dataset (6 Districts, 5 Crops, All Provider Roles)...');

  // A. Seed MandiPrices (6 Districts: Nashik, Pune, Ahmednagar, Nagpur, Latur, Solapur; 5 Crops)
  const now = new Date();
  const mandiData = [
    { crop: 'Onion', district: 'Nashik', market: 'Lasalgaon APMC', pricePerKg: 18.5, arrivalsKg: 45000 },
    { crop: 'Onion', district: 'Ahmednagar', market: 'Rahuri APMC', pricePerKg: 17.2, arrivalsKg: 32000 },
    { crop: 'Tomato', district: 'Nashik', market: 'Pimpalgaon APMC', pricePerKg: 14.0, arrivalsKg: 28000 },
    { crop: 'Tomato', district: 'Pune', market: 'Narayangaon APMC', pricePerKg: 15.5, arrivalsKg: 35000 },
    { crop: 'Soybean', district: 'Latur', market: 'Latur APMC Main', pricePerKg: 44.0, arrivalsKg: 85000 },
    { crop: 'Soybean', district: 'Nagpur', market: 'Nagpur APMC', pricePerKg: 42.8, arrivalsKg: 62000 },
    { crop: 'Grape', district: 'Nashik', market: 'Nashik Grape Yard', pricePerKg: 65.0, arrivalsKg: 20000 },
    { crop: 'Grape', district: 'Solapur', market: 'Solapur APMC', pricePerKg: 58.0, arrivalsKg: 15000 },
    { crop: 'Pomegranate', district: 'Solapur', market: 'Solapur Fruit Yard', pricePerKg: 95.0, arrivalsKg: 18000 },
    { crop: 'Pomegranate', district: 'Nashik', market: 'Satana APMC', pricePerKg: 102.0, arrivalsKg: 12000 },
  ];

  for (const m of mandiData) {
    await prisma.mandiPrice.create({
      data: {
        crop: m.crop,
        district: m.district,
        market: m.market,
        pricePerKg: m.pricePerKg,
        arrivalsKg: m.arrivalsKg,
        source: 'AGMARKNET',
        recordedAt: now,
      },
    });
  }
  console.log(`  - Seeded ${mandiData.length} live MandiPrice records across 6 districts & 5 crops.`);

  // B. Seed Users & Parties
  // 1) Farmers
  const farmer1User = await prisma.user.create({ data: { phone: '+919822012345', preferredLang: 'mr' } });
  const farmer1 = await prisma.party.create({
    data: { userId: farmer1User.id, name: 'Bhausaheb Patil', district: 'Nashik', village: 'Lasalgaon', roles: [PartyRole.FARMER] },
  });

  const farmer2User = await prisma.user.create({ data: { phone: '+919822098765', preferredLang: 'hi' } });
  const farmer2 = await prisma.party.create({
    data: { userId: farmer2User.id, name: 'Sitaram Deshmukh', district: 'Latur', village: 'Murud', roles: [PartyRole.FARMER] },
  });

  // 2) FPO Admin
  const fpoUser = await prisma.user.create({ data: { phone: '+919822044444' } });
  const fpoParty = await prisma.party.create({
    data: { userId: fpoUser.id, name: 'Sahyadri Farmers Producer Co.', district: 'Nashik', village: 'Dindori', roles: [PartyRole.FPO_ADMIN] },
  });
  const fpoObj = await prisma.fpo.create({
    data: { name: 'Sahyadri FPO Nashik', district: 'Nashik', registrationRef: 'SFAC-MH-FPO-2022-9988' },
  });

  // 3) Buyers
  const buyer1User = await prisma.user.create({ data: { phone: '+919890011111' } });
  const buyer1 = await prisma.party.create({
    data: { userId: buyer1User.id, name: 'Reliance Fresh Wholesale', district: 'Mumbai', roles: [PartyRole.BUYER] },
  });

  const buyer2User = await prisma.user.create({ data: { phone: '+919890022222' } });
  const buyer2 = await prisma.party.create({
    data: { userId: buyer2User.id, name: 'Sahyadri Processing Exports', district: 'Pune', roles: [PartyRole.BUYER] },
  });

  // 4) 5 Provider Roles
  // Storage Operator
  const storageUser = await prisma.user.create({ data: { phone: '+919833011111' } });
  const storageProvider = await prisma.party.create({
    data: { userId: storageUser.id, name: 'Nashik Cold Chain Storage Corp', district: 'Nashik', roles: [PartyRole.STORAGE_OPERATOR] },
  });

  // Transport Operator
  const transportUser = await prisma.user.create({ data: { phone: '+919833022222' } });
  const transportProvider = await prisma.party.create({
    data: { userId: transportUser.id, name: 'Maha Super Freight Logistics', district: 'Nashik', roles: [PartyRole.TRANSPORT_OPERATOR] },
  });

  // Equipment Provider
  const equipUser = await prisma.user.create({ data: { phone: '+919833033333' } });
  const equipProvider = await prisma.party.create({
    data: { userId: equipUser.id, name: 'Krishi Harvester & Tractor Hiring', district: 'Ahmednagar', roles: [PartyRole.EQUIPMENT_PROVIDER] },
  });

  // Labor Contractor
  const laborUser = await prisma.user.create({ data: { phone: '+919833044444' } });
  const laborProvider = await prisma.party.create({
    data: { userId: laborUser.id, name: 'Shinde Agricultural Labor Crew', district: 'Solapur', roles: [PartyRole.LABOR_CONTRACTOR] },
  });

  // Input Supplier
  const inputUser = await prisma.user.create({ data: { phone: '+919833055555' } });
  const inputProvider = await prisma.party.create({
    data: { userId: inputUser.id, name: 'Maha Agri Seeds & Bio-Inputs Ltd', district: 'Nashik', roles: [PartyRole.INPUT_SUPPLIER] },
  });

  // 5) Admins
  const distAdminUser = await prisma.user.create({ data: { phone: '+919900011111' } });
  const distAdmin = await prisma.party.create({
    data: { userId: distAdminUser.id, name: 'Shri. V. K. Patil (District Admin Nashik)', district: 'Nashik', roles: [PartyRole.DISTRICT_ADMIN] },
  });

  const stateAdminUser = await prisma.user.create({ data: { phone: '+919900099999' } });
  const stateAdmin = await prisma.party.create({
    data: { userId: stateAdminUser.id, name: 'State Agriculture Dept Admin', district: 'Maharashtra Statewide', roles: [PartyRole.STATE_ADMIN] },
  });

  console.log('  - Seeded 13 Parties across Farmers, Buyers, FPO, Admins, and all 5 Provider roles.');

  // C. Seed Verifications (Multiple States: APPROVED, PENDING, REJECTED)
  const verifApproved = await prisma.verification.create({
    data: {
      partyId: storageProvider.id,
      role: PartyRole.STORAGE_OPERATOR,
      documentType: 'WDRA_LICENSE',
      documentRef: 'WDRA-MH-NSK-2024-001',
      status: VerificationStatus.APPROVED,
      reviewedBy: distAdmin.id,
      reviewedAt: now,
    },
  });

  const verifApprovedInput = await prisma.verification.create({
    data: {
      partyId: inputProvider.id,
      role: PartyRole.INPUT_SUPPLIER,
      documentType: 'PESTICIDE_DEALER_LICENSE',
      documentRef: 'LIC-MH-NSK-2025-7788',
      status: VerificationStatus.APPROVED,
      reviewedBy: distAdmin.id,
      reviewedAt: now,
    },
  });

  const verifPending = await prisma.verification.create({
    data: {
      partyId: equipProvider.id,
      role: PartyRole.EQUIPMENT_PROVIDER,
      documentType: 'MACHINE_REGISTRATION',
      documentRef: 'RC-MH-17-AB-9090',
      status: VerificationStatus.PENDING,
      slaDeadline: new Date(now.getTime() + 24 * 3600 * 1000),
    },
  });

  const verifRejected = await prisma.verification.create({
    data: {
      partyId: laborProvider.id,
      role: PartyRole.LABOR_CONTRACTOR,
      documentType: 'LABOR_REGISTRATION',
      documentRef: 'LAB-MH-2024-EXPIRED',
      status: VerificationStatus.REJECTED,
      rejectionReason: 'Expired license certificate. Please upload current valid renewal.',
      reviewedBy: distAdmin.id,
      reviewedAt: now,
    },
  });

  console.log(`  - Seeded Verifications: APPROVED (${verifApproved.documentType}), PENDING (${verifPending.documentType}), REJECTED (${verifRejected.documentType}).`);

  // D. Seed Listings across Tier A/B/C ResourceTypes
  const listingCrop = await prisma.listing.create({
    data: {
      partyId: farmer1.id,
      resourceType: ResourceType.CROP_LOT,
      district: 'Nashik',
      price: 19.5,
      priceUnit: 'per_kg',
      status: ListingStatus.BOOKED,
      attributes: { crop: 'Onion', quantityKg: 5000, qualityGrade: 'A' },
    },
  });

  const listingSoybean = await prisma.listing.create({
    data: {
      partyId: farmer2.id,
      resourceType: ResourceType.CROP_LOT,
      district: 'Latur',
      price: 44.0,
      priceUnit: 'per_kg',
      status: ListingStatus.BOOKED,
      attributes: { crop: 'Soybean', quantityKg: 10000, qualityGrade: 'A' },
    },
  });

  const listingStorage = await prisma.listing.create({
    data: {
      partyId: storageProvider.id,
      resourceType: ResourceType.COLD_STORAGE,
      district: 'Nashik',
      price: 2.5,
      priceUnit: 'per_kg_per_month',
      status: ListingStatus.OPEN,
      attributes: { facilityName: 'Nashik Cold Chain Facility A', totalCapacityTons: 500, tempRange: '2-4C', humidityPct: 90 },
    },
  });

  const listingTransport = await prisma.listing.create({
    data: {
      partyId: transportProvider.id,
      resourceType: ResourceType.TRANSPORT,
      district: 'Nashik',
      price: 45,
      priceUnit: 'per_km',
      status: ListingStatus.OPEN,
      attributes: { vehicleType: '10-Ton Ventilated Truck', payloadKg: 10000, permitType: 'STATE_PERMIT' },
    },
  });

  const listingEquipment = await prisma.listing.create({
    data: {
      partyId: equipProvider.id,
      resourceType: ResourceType.EQUIPMENT_SERVICE,
      district: 'Ahmednagar',
      price: 1800,
      priceUnit: 'per_acre',
      status: ListingStatus.OPEN,
      attributes: { machineType: 'Harvester', model: 'Mahindra 575 Tractor + Harvester', includesOperator: true },
    },
  });

  const listingInput = await prisma.listing.create({
    data: {
      partyId: inputProvider.id,
      resourceType: ResourceType.INPUT_GROUP_BUY,
      district: 'Nashik',
      price: 450,
      priceUnit: 'per_bag',
      status: ListingStatus.OPEN,
      attributes: { inputType: 'NPK Fertilizer 50kg Bag', minimumGroupQty: 50, bulkDiscountPct: 12 },
    },
  });

  console.log('  - Seeded Listings across CROP_LOT, COLD_STORAGE, TRANSPORT, EQUIPMENT_SERVICE, INPUT_GROUP_BUY.');

  // E. Seed Requirement, Offer & Bookings in various states
  const req1 = await prisma.requirement.create({
    data: {
      partyId: buyer1.id,
      resourceType: ResourceType.CROP_LOT,
      district: 'Nashik',
      quantityNeeded: 5000,
      budget: 20.0,
      attributes: { crop: 'Onion', qualityGrade: 'A' },
    },
  });

  const offer1 = await prisma.offer.create({
    data: {
      listingId: listingCrop.id,
      requirementId: req1.id,
      price: 19.5,
      status: OfferStatus.ACCEPTED,
    },
  });

  const booking1 = await prisma.booking.create({
    data: {
      offerId: offer1.id,
      totalAmount: 97500,
      fulfillmentStatus: FulfillmentStatus.IN_PROGRESS,
      paymentStatus: PaymentStatus.ESCROWED,
      logisticsNote: 'Dispatched via Maha Super Freight Logistics Truck #MH-15-AB-1234',
    },
  });

  // F. Seed Disputes: 1 Resolved & 1 Escalated
  // Completed booking for resolved dispute
  const req2 = await prisma.requirement.create({
    data: {
      partyId: buyer2.id,
      resourceType: ResourceType.CROP_LOT,
      district: 'Latur',
      quantityNeeded: 10000,
      budget: 45.0,
      attributes: { crop: 'Soybean' },
    },
  });

  const offer2 = await prisma.offer.create({
    data: {
      listingId: listingSoybean.id,
      requirementId: req2.id,
      price: 44.0,
      status: OfferStatus.ACCEPTED,
    },
  });

  const bookingResolved = await prisma.booking.create({
    data: {
      offerId: offer2.id,
      totalAmount: 440000,
      fulfillmentStatus: FulfillmentStatus.COMPLETED,
      paymentStatus: PaymentStatus.RELEASED,
    },
  });

  const disputeResolved = await prisma.dispute.create({
    data: {
      bookingId: bookingResolved.id,
      raisedByPartyId: buyer2.id,
      respondentPartyId: farmer1.id,
      category: DisputeCategory.QUALITY,
      reason: '2% moisture content deviation',
      status: DisputeStatus.RESOLVED,
      districtAdminId: distAdmin.id,
      resolutionNote: 'Mutually agreed 1.5% price adjustment applied. Escrow balance released to farmer.',
      resolvedAt: now,
    },
  });

  // Booking for Escalated dispute
  const req3 = await prisma.requirement.create({
    data: {
      partyId: buyer1.id,
      resourceType: ResourceType.COLD_STORAGE,
      district: 'Nashik',
      quantityNeeded: 2000,
      budget: 3.0,
      attributes: { facilityName: 'Nashik Cold Chain' },
    },
  });
  const offer3 = await prisma.offer.create({
    data: {
      listingId: listingStorage.id,
      requirementId: req3.id,
      price: 2.5,
      status: OfferStatus.ACCEPTED,
    },
  });
  const bookingEscalated = await prisma.booking.create({
    data: {
      offerId: offer3.id,
      totalAmount: 5000,
      fulfillmentStatus: FulfillmentStatus.IN_PROGRESS,
      paymentStatus: PaymentStatus.ESCROWED,
    },
  });

  const disputeEscalated = await prisma.dispute.create({
    data: {
      bookingId: bookingEscalated.id,
      raisedByPartyId: buyer1.id,
      respondentPartyId: storageProvider.id,
      category: DisputeCategory.STORAGE_DAMAGE,
      reason: 'Temperature fluctuation damaged 500kg stored produce.',
      status: DisputeStatus.ESCALATED,
      districtAdminId: distAdmin.id,
      stateAdminId: stateAdmin.id,
      slaDeadline: new Date(now.getTime() - 3600 * 1000), // PAST SLA -> Escalated
    },
  });

  console.log(`  - Seeded Disputes: RESOLVED (ID=${disputeResolved.id}), ESCALATED to State Admin (ID=${disputeEscalated.id}).`);

  // G. Seed Marketplace Ad (Gated on verified input provider)
  await prisma.marketplaceAd.create({
    data: {
      partyId: inputProvider.id,
      title: 'Certified NPK Bio-Fertilizer 50kg',
      description: 'Government tested & approved organic bio-fertilizer for Nashik onion & grape crops.',
      imageUrl: 'https://krishisetu.gov.in/assets/ads/npk.jpg',
      targetUrl: 'https://krishisetu.gov.in/inputs/npk',
      placement: 'RESOURCE_DETAIL',
      active: true,
    },
  });

  // H. Seed DistrictDailyStats & StateDailyStats
  await prisma.districtDailyStats.create({
    data: {
      district: 'Nashik',
      date: now,
      avgPricePerCrop: { Onion: 18.5, Tomato: 14.0, Grape: 65.0 },
      totalLotsCreated: 12,
      totalLotsMatched: 9,
      totalLotsPooled: 3,
      activeStorageUtilizationPct: 68.5,
      activeTransportBookings: 8,
      pendingVerifications: 1,
      openDisputes: 1,
      resolvedDisputesWithinSla: 4,
    },
  });

  await prisma.stateDailyStats.create({
    data: {
      date: now,
      avgPricePerCropByDistrict: {
        Nashik: { Onion: 18.5, Tomato: 14.0, Grape: 65.0 },
        Ahmednagar: { Onion: 17.2 },
        Pune: { Tomato: 15.5 },
        Latur: { Soybean: 44.0 },
        Nagpur: { Soybean: 42.8 },
        Solapur: { Pomegranate: 95.0, Grape: 58.0 },
      },
      aggregationRateByDistrict: { Nashik: 0.25, Latur: 0.3, Pune: 0.15 },
      integrationHealthSummary: { AGMARKNET: 'ONLINE', PAYMENT_GW: 'STUBBED', NABARD_SFAC: 'STUBBED' },
      escalatedItemsCount: 1,
    },
  });

  console.log('  - Seeded DistrictDailyStats & StateDailyStats aggregation data.');

  // I. Seed PortalSyncLogs (Multi-Tier)
  await prisma.portalSyncLog.create({
    data: { portal: 'AGMARKNET', tier: 1, status: 'SUCCESS', message: 'Agmarknet live sync completed: 45 fetched, 15 ingested.' },
  });
  await prisma.portalSyncLog.create({
    data: { portal: 'PAYMENT_GW', tier: 3, status: 'STUBBED', message: `Payment escrowed for Booking ${booking1.id}: Rs 97,500` },
  });
  await prisma.portalSyncLog.create({
    data: { portal: 'NABARD_SFAC', tier: 3, status: 'STUBBED', message: 'NABARD/SFAC FPO Registry stub adapter sync batch completed.' },
  });

  console.log('  - Seeded multi-portal PortalSyncLog audit records.');
  console.log('\n================================================================');
  console.log('  SEEDING COMPLETE');
  console.log('================================================================');
}

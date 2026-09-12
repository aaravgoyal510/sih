import { prisma } from '../config/prisma';

export interface AggregationOptions {
  targetDate?: Date; // Target date for aggregation (defaults to today)
}

export class AggregationService {
  /**
   * Run full daily aggregation pipeline:
   * 1. Compute DistrictDailyStats for all active districts
   * 2. Roll up DistrictDailyStats into StateDailyStats
   */
  async runDailyAggregation(options: AggregationOptions = {}) {
    const targetDate = options.targetDate || new Date();
    // Normalize targetDate to start of day UTC
    const dateStart = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0, 0));
    const dateEnd = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59, 999));

    console.log(`[AggregationService] Starting aggregation for date: ${dateStart.toISOString().split('T')[0]}`);

    // 1. Identify all unique districts from Parties, Listings, MandiPrices, Verifications
    const districts = await this.getUniqueDistricts();
    console.log(`[AggregationService] Processing ${districts.length} active district(s):`, districts);

    const districtStatsList: any[] = [];

    for (const district of districts) {
      const stats = await this.aggregateDistrictStats(district, dateStart, dateEnd);
      districtStatsList.push(stats);
    }

    // 2. Roll up into StateDailyStats
    const stateStats = await this.aggregateStateStats(districtStatsList, dateStart, dateEnd);

    return {
      date: dateStart,
      districtStatsCount: districtStatsList.length,
      districtStats: districtStatsList,
      stateStats,
    };
  }

  /**
   * Compute & upsert DistrictDailyStats for a single district
   */
  private async aggregateDistrictStats(district: string, dateStart: Date, dateEnd: Date) {
    // a. Mandi Prices avg per crop for this district
    // Query recent MandiPrice records for this district (on or around target date)
    const mandiPrices = await prisma.mandiPrice.findMany({
      where: {
        district: { equals: district, mode: 'insensitive' },
        recordedAt: { gte: new Date(dateStart.getTime() - 7 * 86400000), lte: dateEnd },
        source: 'AGMARKNET_LIVE',
      },
      select: { crop: true, pricePerKg: true, market: true },
      orderBy: { recordedAt: 'desc' },
    });

    const cropPriceMap: Record<string, number[]> = {};
    const seenMarkets = new Set<string>();
    for (const mp of mandiPrices) {
      const crop = mp.crop;
      const key = `${crop.toLowerCase()}|${mp.market.toLowerCase()}`;
      if (seenMarkets.has(key)) continue;
      seenMarkets.add(key);
      if (!cropPriceMap[crop]) cropPriceMap[crop] = [];
      cropPriceMap[crop].push(mp.pricePerKg);
    }

    const avgPricePerCrop: Record<string, number> = {};
    for (const crop of Object.keys(cropPriceMap)) {
      const prices = cropPriceMap[crop];
      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      avgPricePerCrop[crop] = Number(avg.toFixed(2));
    }

    // b. Listings created on target date in this district
    const listingsInDistrict = await prisma.listing.findMany({
      where: {
        district: { equals: district, mode: 'insensitive' },
        createdAt: { gte: dateStart, lte: dateEnd },
      },
      select: { id: true, attributes: true, resourceType: true },
    });

    const totalLotsCreated = listingsInDistrict.length;

    // c. Pooled listings
    const totalLotsPooled = listingsInDistrict.filter((l) => {
      const attrs = l.attributes as Record<string, any> | null;
      return attrs && attrs.isPooled === true;
    }).length;

    // d. Offers matched on target date for listings in this district
    const totalLotsMatched = await prisma.offer.count({
      where: {
        listing: { district: { equals: district, mode: 'insensitive' } },
        createdAt: { gte: dateStart, lte: dateEnd },
      },
    });

    // e. Active Transport Bookings
    const activeTransportBookings = await prisma.booking.count({
      where: {
        offer: {
          listing: {
            resourceType: 'TRANSPORT',
            district: { equals: district, mode: 'insensitive' },
          },
        },
        paymentStatus: { in: ['PENDING', 'ESCROWED', 'RELEASED'] },
        createdAt: { gte: dateStart, lte: dateEnd },
      },
    });

    // f. Pending Verifications in this district
    const pendingVerifications = await prisma.verification.count({
      where: {
        party: { district: { equals: district, mode: 'insensitive' } },
        status: 'PENDING',
      },
    });

    // g. Open disputes in this district
    const openDisputes = await prisma.dispute.count({
      where: {
        booking: {
          offer: {
            listing: { district: { equals: district, mode: 'insensitive' } },
          },
        },
        status: { in: ['OPEN', 'UNDER_DISTRICT_REVIEW', 'ESCALATED'] },
      },
    });

    // h. Resolved disputes within SLA in this district
    const resolvedDisputes = await prisma.dispute.findMany({
      where: {
        booking: {
          offer: {
            listing: { district: { equals: district, mode: 'insensitive' } },
          },
        },
        status: 'RESOLVED',
      },
      select: { slaDeadline: true, resolvedAt: true },
    });

    const resolvedDisputesWithinSla = resolvedDisputes.filter((d) => {
      if (!d.resolvedAt) return false;
      if (!d.slaDeadline) return true; // resolved without SLA breach
      return d.resolvedAt <= d.slaDeadline;
    }).length;

    // i. Active Storage Utilization Pct
    // Check if there are WarehouseReceipts or COLD_STORAGE capacity entries for this district
    const warehouseReceipts = await prisma.warehouseReceipt.findMany({
      where: {
        party: { district: { equals: district, mode: 'insensitive' } },
        status: 'ACTIVE',
      },
    });

    let activeStorageUtilizationPct: number | null = null;
    if (warehouseReceipts.length > 0) {
      // Calculate utilization if warehouse capacity data exists
      const totalStoredKg = warehouseReceipts.reduce((sum, wr) => sum + wr.quantityKg, 0);
      // Assuming aggregate capacity baseline (or placeholder capacity) if defined
      activeStorageUtilizationPct = Number((totalStoredKg / 10000).toFixed(2)); // percentage of 10,000kg baseline
    } else {
      // EXPLICIT WARNING: Data insufficient to compute storage utilization for this district
      console.warn(`[AggregationService] DATA GAP: Insufficient active storage capacity data for district "${district}". activeStorageUtilizationPct set to NULL.`);
      activeStorageUtilizationPct = null;
    }

    // Upsert DistrictDailyStats row
    const existingStats = await prisma.districtDailyStats.findFirst({
      where: {
        district: { equals: district, mode: 'insensitive' },
        date: dateStart,
      },
    });

    const statsData = {
      district,
      date: dateStart,
      avgPricePerCrop,
      totalLotsCreated,
      totalLotsMatched,
      totalLotsPooled,
      activeStorageUtilizationPct,
      activeTransportBookings,
      pendingVerifications,
      openDisputes,
      resolvedDisputesWithinSla,
    };

    let result;
    if (existingStats) {
      result = await prisma.districtDailyStats.update({
        where: { id: existingStats.id },
        data: statsData,
      });
    } else {
      result = await prisma.districtDailyStats.create({
        data: statsData,
      });
    }

    return result;
  }

  /**
   * Aggregate DistrictDailyStats into StateDailyStats
   */
  private async aggregateStateStats(districtStatsList: any[], dateStart: Date, dateEnd: Date) {
    // 1. Map avgPricePerCrop by district
    const avgPricePerCropByDistrict: Record<string, any> = {};
    const aggregationRateByDistrict: Record<string, number> = {};

    for (const ds of districtStatsList) {
      avgPricePerCropByDistrict[ds.district] = ds.avgPricePerCrop;
      const rate = ds.totalLotsCreated > 0 ? Number((ds.totalLotsPooled / ds.totalLotsCreated).toFixed(2)) : 0;
      aggregationRateByDistrict[ds.district] = rate;
    }

    // 2. Integration health summary from PortalSyncLog
    const portalLogs = await prisma.portalSyncLog.findMany({
      take: 50,
      orderBy: { syncedAt: 'desc' },
    });

    const integrationHealthSummary = {
      totalLogs: portalLogs.length,
      successCount: portalLogs.filter((p) => p.status === 'SUCCESS').length,
      failedCount: portalLogs.filter((p) => p.status === 'FAILED').length,
      stubbedCount: portalLogs.filter((p) => p.status === 'STUBBED').length,
      portals: Array.from(new Set(portalLogs.map((p) => p.portal))),
    };

    // 3. Escalated items count across state (verifications + disputes)
    const escalatedVerificationsCount = await prisma.verification.count({
      where: { status: 'ESCALATED' },
    });

    const escalatedDisputesCount = await prisma.dispute.count({
      where: { status: 'ESCALATED' },
    });

    const escalatedItemsCount = escalatedVerificationsCount + escalatedDisputesCount;

    // Upsert StateDailyStats row
    const existingStateStats = await prisma.stateDailyStats.findFirst({
      where: { date: dateStart },
    });

    const stateData = {
      date: dateStart,
      avgPricePerCropByDistrict,
      aggregationRateByDistrict,
      integrationHealthSummary,
      escalatedItemsCount,
    };

    let result;
    if (existingStateStats) {
      result = await prisma.stateDailyStats.update({
        where: { id: existingStateStats.id },
        data: stateData,
      });
    } else {
      result = await prisma.stateDailyStats.create({
        data: stateData,
      });
    }

    return result;
  }

  /**
   * Helper: extract unique districts across Parties, MandiPrices, and Listings
   */
  private async getUniqueDistricts(): Promise<string[]> {
    const partyDistricts = await prisma.party.findMany({
      select: { district: true },
      distinct: ['district'],
    });

    const mandiDistricts = await prisma.mandiPrice.findMany({
      select: { district: true },
      distinct: ['district'],
    });

    const listingDistricts = await prisma.listing.findMany({
      select: { district: true },
      distinct: ['district'],
    });

    const set = new Set<string>();
    partyDistricts.forEach((p) => p.district && set.add(p.district));
    mandiDistricts.forEach((m) => m.district && set.add(m.district));
    listingDistricts.forEach((l) => l.district && set.add(l.district));

    // Default to Pune, Nashik if empty
    if (set.size === 0) {
      set.add('Pune');
      set.add('Nashik');
    }

    return Array.from(set);
  }
}

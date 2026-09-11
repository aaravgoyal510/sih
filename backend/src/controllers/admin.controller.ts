import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * GET /api/admin/state-dashboard
 * Fetch statewide aggregated metrics, district breakdowns, integration health,
 * and escalated item queues for STATE_ADMIN / PLATFORM_ADMIN.
 */
export const getStateDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // 1. Get latest StateDailyStats
    const latestStateStats = await prisma.stateDailyStats.findFirst({
      orderBy: { date: 'desc' },
    });

    const targetDate = latestStateStats ? latestStateStats.date : new Date();

    // 2. Get DistrictDailyStats for the target date
    const districtStats = await prisma.districtDailyStats.findMany({
      where: { date: targetDate },
      orderBy: { district: 'asc' },
    });

    // 3. Escalated verifications queue (status = ESCALATED)
    const escalatedVerifications = await prisma.verification.findMany({
      where: { status: 'ESCALATED' },
      include: {
        party: {
          select: { id: true, name: true, district: true, roles: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 4. Escalated disputes queue (status = ESCALATED)
    const escalatedDisputes = await prisma.dispute.findMany({
      where: { status: 'ESCALATED' },
      include: {
        booking: {
          include: {
            offer: {
              include: {
                listing: { select: { id: true, district: true, resourceType: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 5. Recent Integration / Portal Logs (Integration Health View)
    const integrationLogs = await prisma.portalSyncLog.findMany({
      take: 20,
      orderBy: { syncedAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      asOfDate: targetDate.toISOString(),
      stateSummary: {
        id: latestStateStats?.id || null,
        districtsCount: districtStats.length,
        escalatedItemsCount: (latestStateStats?.escalatedItemsCount ?? 0) + escalatedVerifications.length + escalatedDisputes.length,
        integrationHealthSummary: latestStateStats?.integrationHealthSummary || null,
        aggregationRateByDistrict: latestStateStats?.aggregationRateByDistrict || {},
      },
      districtBreakdown: districtStats.map((ds) => ({
        id: ds.id,
        district: ds.district,
        avgPricePerCrop: ds.avgPricePerCrop,
        totalLotsCreated: ds.totalLotsCreated,
        totalLotsMatched: ds.totalLotsMatched,
        totalLotsPooled: ds.totalLotsPooled,
        activeStorageUtilizationPct: ds.activeStorageUtilizationPct,
        activeTransportBookings: ds.activeTransportBookings,
        pendingVerifications: ds.pendingVerifications,
        openDisputes: ds.openDisputes,
        resolvedDisputesWithinSla: ds.resolvedDisputesWithinSla,
        // Flag data gap explicitly
        storageDataStatus: ds.activeStorageUtilizationPct === null ? 'NO_DATA' : 'AVAILABLE',
      })),
      escalatedQueue: {
        verificationsCount: escalatedVerifications.length,
        verifications: escalatedVerifications,
        disputesCount: escalatedDisputes.length,
        disputes: escalatedDisputes,
      },
      integrationHealth: {
        recentLogsCount: integrationLogs.length,
        logs: integrationLogs,
      },
    });
  } catch (error: any) {
    console.error('Error fetching state dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch state dashboard data',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/price-heatmap
 * Price Heatmap API per TechSpec.md §5 & Design.md §8:
 * - Metric: Default to price deviation from state average (not absolute price).
 * - "No Data" handling: Districts with empty / insufficient Tier-1 coverage return
 *   explicit status "NO_DATA", avgPrice: null, deviationFromStateAvgPct: null (never defaulted to zero).
 */
export const getPriceHeatmap = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const selectedCrop = (req.query.crop as string) || 'Tomato';

    // 1. Get latest StateDailyStats & DistrictDailyStats
    const latestStateStats = await prisma.stateDailyStats.findFirst({
      orderBy: { date: 'desc' },
    });

    const targetDate = latestStateStats ? latestStateStats.date : new Date();

    const districtStats = await prisma.districtDailyStats.findMany({
      where: { date: targetDate },
    });

    // Also check MandiPrice table for recent records if DistrictDailyStats row has no prices
    const districtsWithValidPrice: Array<{ district: string; price: number }> = [];

    // Calculate prices for districts
    const districtPriceList = await Promise.all(
      districtStats.map(async (ds) => {
        const pricesJson = ds.avgPricePerCrop as Record<string, number> | null;
        let cropPrice: number | null = null;

        if (pricesJson && typeof pricesJson[selectedCrop] === 'number') {
          cropPrice = pricesJson[selectedCrop];
        } else {
          // Check if MandiPrice has any entry for this crop & district
          const recentMp = await prisma.mandiPrice.findFirst({
            where: {
              district: { equals: ds.district, mode: 'insensitive' },
              crop: { equals: selectedCrop, mode: 'insensitive' },
              source: 'AGMARKNET_LIVE',
            },
            orderBy: { recordedAt: 'desc' },
          });

          if (recentMp) {
            cropPrice = recentMp.pricePerKg;
          }
        }

        if (cropPrice !== null) {
          districtsWithValidPrice.push({ district: ds.district, price: cropPrice });
        }

        return {
          district: ds.district,
          cropPrice,
        };
      })
    );

    // Calculate statewide average for the selected crop across districts with valid data
    let stateAvgPrice: number | null = null;
    if (districtsWithValidPrice.length > 0) {
      const sum = districtsWithValidPrice.reduce((acc, curr) => acc + curr.price, 0);
      stateAvgPrice = Number((sum / districtsWithValidPrice.length).toFixed(2));
    }

    // Build heatmap item per district
    const heatmap = districtPriceList.map((item) => {
      if (item.cropPrice === null) {
        // EXPLICIT "NO DATA" HANDLING per Design.md §8 & TechSpec.md §5:
        // Must render as distinct "NO_DATA", never defaulted to zero or omitted!
        return {
          district: item.district,
          crop: selectedCrop,
          hasData: false,
          status: 'NO_DATA',
          avgPricePerKg: null,
          stateAvgPricePerKg: stateAvgPrice,
          deviationFromStateAvgPct: null,
          message: `Insufficient Tier-1 Agmarknet market price data for ${selectedCrop} in ${item.district}`,
        };
      }

      // Active price deviation from state average
      const deviation = stateAvgPrice && stateAvgPrice > 0
        ? Number((((item.cropPrice - stateAvgPrice) / stateAvgPrice) * 100).toFixed(2))
        : 0;

      return {
        district: item.district,
        crop: selectedCrop,
        hasData: true,
        status: 'ACTIVE',
        avgPricePerKg: item.cropPrice,
        stateAvgPricePerKg: stateAvgPrice,
        deviationFromStateAvgPct: deviation,
        message: `Price deviation is ${deviation >= 0 ? '+' : ''}${deviation}% relative to state average (Rs ${stateAvgPrice}/kg)`,
      };
    });

    res.status(200).json({
      success: true,
      asOfDate: targetDate.toISOString(),
      crop: selectedCrop,
      stateAvgPricePerKg: stateAvgPrice,
      districtsReportingCount: districtsWithValidPrice.length,
      districtsNoDataCount: heatmap.filter((h) => !h.hasData).length,
      heatmap,
    });
  } catch (error: any) {
    console.error('Error fetching price heatmap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch price heatmap data',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/portal-sync-logs
 * Surfaces PortalSyncLog entries across ALL portals (AGMARKNET, PAYMENT_GW, NABARD_SFAC, etc.)
 * for district/state admin visibility, per TechSpec.md §9.
 */
export const getPortalSyncLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { portal, status, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (portal && typeof portal === 'string') {
      where.portal = portal.toUpperCase();
    }
    if (status && typeof status === 'string') {
      where.status = status.toUpperCase();
    }

    const take = Math.min(parseInt(limit as string, 10) || 50, 100);
    const skip = parseInt(offset as string, 10) || 0;

    const [logs, totalCount] = await Promise.all([
      prisma.portalSyncLog.findMany({
        where,
        orderBy: { syncedAt: 'desc' },
        take,
        skip,
      }),
      prisma.portalSyncLog.count({ where }),
    ]);

    // Group logs by portal to summarize sync status across integration tiers
    const summaryByPortal = await prisma.portalSyncLog.groupBy({
      by: ['portal', 'tier', 'status'],
      _count: { id: true },
      _max: { syncedAt: true },
    });

    res.status(200).json({
      success: true,
      totalCount,
      limit: take,
      offset: skip,
      summaryByPortal: summaryByPortal.map((s) => ({
        portal: s.portal,
        tier: s.tier,
        status: s.status,
        logCount: s._count.id,
        latestSyncAt: s._max.syncedAt,
      })),
      logs,
    });
  } catch (error: any) {
    console.error('Error fetching portal sync logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch portal sync logs',
      error: error.message,
    });
  }
};


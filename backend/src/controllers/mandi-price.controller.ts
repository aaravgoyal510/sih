import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// Memory cache fallback for ultra-high availability when DB connection fails
let lastCachedMandiPrices: any[] = [];
let lastCacheTimestamp: string = new Date().toISOString();

export const updateMemoryCache = (prices: any[]) => {
  if (prices && prices.length > 0) {
    lastCachedMandiPrices = prices;
    lastCacheTimestamp = new Date().toISOString();
  }
};

export const getMandiPrices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { crop, district, limit } = req.query;
    const fetchLimit = limit ? parseInt(limit as string, 10) : 50;

    const where: any = {};
    if (crop) where.crop = { contains: crop as string, mode: 'insensitive' };
    if (district) where.district = { contains: district as string, mode: 'insensitive' };

    const prices = await prisma.mandiPrice.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: fetchLimit,
    });

    if (prices.length > 0) {
      updateMemoryCache(prices);
    }

    res.status(200).json({
      success: true,
      cached: false,
      count: prices.length,
      prices,
    });
  } catch (error: any) {
    console.warn('[MANDI PRICE API] DB Query Failed. Serving last-cached fallback data per TechSpec.md §6.1:', error.message);

    res.status(200).json({
      success: true,
      cached: true,
      lastSyncedAt: lastCacheTimestamp,
      count: lastCachedMandiPrices.length,
      prices: lastCachedMandiPrices,
      warning: 'Live data source unavailable. Serving last cached mandi prices.',
    });
  }
};

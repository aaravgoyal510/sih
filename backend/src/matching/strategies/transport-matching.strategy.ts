import { Requirement } from '@prisma/client';
import { MatchingStrategy, ListingWithParty, MatchCandidateResult } from '../matching-engine.interface';

export class TransportMatchingStrategy implements MatchingStrategy {
  scoreCandidates(requirement: Requirement, candidates: ListingWithParty[]): MatchCandidateResult[] {
    const reqAttrs = (requirement.attributes as any) || {};
    const reqFrom = (reqAttrs.from || reqAttrs.route?.from || requirement.district || '').toLowerCase();
    const reqTo = (reqAttrs.to || reqAttrs.route?.to || '').toLowerCase();
    const reqCap = Number(reqAttrs.capacityKg || reqAttrs.requiredCapacityKg || 0);
    const reqPrice = Number(requirement.targetPricePerKg || reqAttrs.maxPricePerTrip || 0);

    const scored: MatchCandidateResult[] = [];

    for (const listing of candidates) {
      if (listing.resourceType !== 'TRANSPORT') continue;

      const listAttrs = (listing.attributes as any) || {};
      const listRoute = listAttrs.route || {};
      const listFrom = (listRoute.from || listing.district || '').toLowerCase();
      const listTo = (listRoute.to || '').toLowerCase();
      const listCap = Number(listAttrs.capacityKg || 0);
      const listPrice = Number(listing.price || listAttrs.pricePerTrip || 0);
      const listTitle = listAttrs.title || `${listAttrs.vehicleType || 'Transport'} (${listRoute.from || listing.district} -> ${listRoute.to || 'Any'})`;

      // 1. Route Overlap (40%)
      let routeOverlap = 20;
      const matchFrom = reqFrom && listFrom && (reqFrom.includes(listFrom) || listFrom.includes(reqFrom));
      const matchTo = reqTo && listTo && (reqTo.includes(listTo) || listTo.includes(reqTo));

      if (matchFrom && matchTo) {
        routeOverlap = 100; // Perfect route match
      } else if (matchFrom) {
        routeOverlap = 70; // Pickup district matches
      } else if (matchTo) {
        routeOverlap = 50; // Dropoff district matches
      }

      // 2. Capacity Fit (30%)
      let capacityFit = 100;
      if (reqCap > 0 && listCap > 0) {
        capacityFit = Math.min(1.0, listCap / reqCap) * 100;
      }

      // 3. Price Score (30%)
      let priceScore = 100;
      if (reqPrice > 0 && listPrice > 0) {
        if (listPrice <= reqPrice) {
          priceScore = 100;
        } else {
          const diffPct = ((listPrice - reqPrice) / reqPrice) * 100;
          priceScore = Math.max(0, 100 - diffPct);
        }
      }

      // Weighted Composite Score
      const totalScore = Math.round(
        routeOverlap * 0.40 +
        capacityFit * 0.30 +
        priceScore * 0.30
      );

      scored.push({
        listingId: listing.id,
        title: listTitle,
        resourceType: listing.resourceType,
        district: listing.district,
        price: listPrice,
        score: totalScore,
        subScores: {
          routeOverlap: Math.round(routeOverlap),
          capacityFit: Math.round(capacityFit),
          priceScore: Math.round(priceScore),
        },
        partyName: listing.party?.name || 'Transport Provider',
        credibilityScore: listing.party?.credibility?.score ?? 50.0,
      });
    }

    return scored.sort((a, b) => b.score - a.score);
  }
}

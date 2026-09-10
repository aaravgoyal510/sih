import { Requirement } from '@prisma/client';
import { MatchingStrategy, ListingWithParty, MatchCandidateResult } from '../matching-engine.interface';
import { getDistrictDistanceScore } from '../district-proximity';

export class StorageMatchingStrategy implements MatchingStrategy {
  scoreCandidates(requirement: Requirement, candidates: ListingWithParty[]): MatchCandidateResult[] {
    const reqAttrs = (requirement.attributes as any) || {};
    const reqCrop = (reqAttrs.crop || '').toLowerCase();
    const reqCap = Number(reqAttrs.capacityQuintal || reqAttrs.requiredCapacityQuintal || 0);

    const scored: MatchCandidateResult[] = [];

    for (const listing of candidates) {
      if (listing.resourceType !== 'COLD_STORAGE') continue;

      const listAttrs = (listing.attributes as any) || {};
      const listCap = Number(listAttrs.capacityQuintal || 0);
      const suitableCrops: string[] = (listAttrs.cropSuitability || []).map((c: string) => c.toLowerCase());
      const listPrice = Number(listing.price || listAttrs.pricePerQuintalMonth || 0);
      const listTitle = listAttrs.title || `Cold Storage in ${listing.district} (${listCap} Qtl)`;

      // 1. Capacity Fit (30%)
      let capacityFit = 100;
      if (reqCap > 0 && listCap > 0) {
        capacityFit = Math.min(1.0, listCap / reqCap) * 100;
      }

      // 2. Crop Suitability (30%)
      let cropSuitability = 100;
      if (reqCrop && suitableCrops.length > 0) {
        const matches = suitableCrops.some((c) => c.includes(reqCrop) || reqCrop.includes(c));
        cropSuitability = matches ? 100 : 20;
      }

      // 3. Distance Score (20%)
      const distanceScore = getDistrictDistanceScore(requirement.district, listing.district);

      // 4. Duration Overlap (20%) - Default 100 if flexible or dates match
      const durationOverlap = 100;

      // Weighted Composite Score
      const totalScore = Math.round(
        capacityFit * 0.30 +
        cropSuitability * 0.30 +
        distanceScore * 0.20 +
        durationOverlap * 0.20
      );

      scored.push({
        listingId: listing.id,
        title: listTitle,
        resourceType: listing.resourceType,
        district: listing.district,
        price: listPrice,
        score: totalScore,
        subScores: {
          capacityFit: Math.round(capacityFit),
          cropSuitability: Math.round(cropSuitability),
          distance: Math.round(distanceScore),
          durationOverlap: Math.round(durationOverlap),
        },
        partyName: listing.party?.name || 'Storage Provider',
        credibilityScore: listing.party?.credibility?.score ?? 50.0,
      });
    }

    return scored.sort((a, b) => b.score - a.score);
  }
}

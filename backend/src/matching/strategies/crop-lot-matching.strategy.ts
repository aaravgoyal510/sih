import { Requirement } from '@prisma/client';
import { MatchingStrategy, ListingWithParty, MatchCandidateResult } from '../matching-engine.interface';
import { getDistrictDistanceScore } from '../district-proximity';

export class CropLotMatchingStrategy implements MatchingStrategy {
  scoreCandidates(requirement: Requirement, candidates: ListingWithParty[]): MatchCandidateResult[] {
    const reqAttrs = (requirement.attributes as any) || {};
    const reqCrop = (reqAttrs.crop || '').toLowerCase();
    const reqQty = Number(reqAttrs.quantityKg || reqAttrs.targetQuantity || 0);
    const reqGrade = (reqAttrs.qualityGrade || reqAttrs.qualitySpec || 'B').toUpperCase();
    const reqPrice = Number(requirement.targetPricePerKg || reqAttrs.maxPricePerKg || 0);

    const scored: MatchCandidateResult[] = [];

    for (const listing of candidates) {
      if (listing.resourceType !== 'CROP_LOT') continue;

      const listAttrs = (listing.attributes as any) || {};
      const listCrop = (listAttrs.crop || '').toLowerCase();
      const listQty = Number(listAttrs.quantityKg || 0);
      const listGrade = (listAttrs.qualityGrade || 'B').toUpperCase();
      const listPrice = Number(listing.price || listAttrs.pricePerKg || 0);
      const listTitle = listAttrs.title || `${listGrade} Grade ${listAttrs.crop || 'Crop'} Lot (${listQty}kg)`;

      // Crop must match, otherwise zero fit score
      if (reqCrop && listCrop && !listCrop.includes(reqCrop) && !reqCrop.includes(listCrop)) {
        continue; // Skip completely irrelevant crop types
      }

      // 1. Quality Fit (25%)
      let qualityFit = 100;
      if (reqGrade === 'A') {
        if (listGrade === 'B') qualityFit = 70;
        else if (listGrade === 'C') qualityFit = 40;
      } else if (reqGrade === 'B') {
        if (listGrade === 'C') qualityFit = 60;
      }
      // If listGrade is higher than reqGrade (e.g. B requested, A provided), qualityFit = 100

      // 2. Quantity Fit (25%)
      let quantityFit = 100;
      if (reqQty > 0) {
        quantityFit = Math.min(1.0, listQty / reqQty) * 100;
      }

      // 3. Distance Score (20%)
      const distanceScore = getDistrictDistanceScore(requirement.district, listing.district);

      // 4. Credibility Score (15%)
      const credibilityScore = listing.party?.credibility?.score ?? 50.0;

      // 5. Price Score (15%)
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
        qualityFit * 0.25 +
        quantityFit * 0.25 +
        distanceScore * 0.20 +
        credibilityScore * 0.15 +
        priceScore * 0.15
      );

      scored.push({
        listingId: listing.id,
        title: listTitle,
        resourceType: listing.resourceType,
        district: listing.district,
        price: listPrice,
        score: totalScore,
        subScores: {
          qualityFit: Math.round(qualityFit),
          quantityFit: Math.round(quantityFit),
          distance: Math.round(distanceScore),
          credibility: Math.round(credibilityScore),
          price: Math.round(priceScore),
        },
        partyName: listing.party?.name || 'Unknown Seller',
        credibilityScore: Math.round(credibilityScore),
      });
    }

    // Sort descending by total score
    return scored.sort((a, b) => b.score - a.score);
  }
}

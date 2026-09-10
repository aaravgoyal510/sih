import { Requirement } from '@prisma/client';
import { MatchingStrategy, ListingWithParty, MatchCandidateResult } from '../matching-engine.interface';

export class ContractFarmingStrategy implements MatchingStrategy {
  scoreCandidates(requirement: Requirement, candidates: ListingWithParty[]): MatchCandidateResult[] {
    const reqAttrs = (requirement.attributes as any) || {};
    const reqCrop = (reqAttrs.crop || '').toLowerCase();
    const reqQualitySpec = (reqAttrs.qualitySpec || '').toLowerCase();
    const reqBudget = Number(requirement.budget || reqAttrs.agreedPricePerKg || 0);

    const scored: MatchCandidateResult[] = [];

    for (const listing of candidates) {
      if (listing.resourceType !== 'CONTRACT_FARMING') continue;

      const listAttrs = (listing.attributes as any) || {};
      const listCrop = (listAttrs.crop || '').toLowerCase();
      const listQualitySpec = (listAttrs.qualitySpec || '').toLowerCase();
      const listPrice = Number(listing.price || listAttrs.agreedPricePerKg || 0);
      const listTitle = `Contract Farming: ${listAttrs.crop || 'Crop'} (${listAttrs.qualitySpec || 'Standard Spec'})`;

      // Filter out mismatched crops completely
      if (reqCrop && listCrop && !listCrop.includes(reqCrop) && !reqCrop.includes(listCrop)) {
        continue;
      }

      // 1. Crop & Quality Spec Match (35%)
      let cropQualityFit = 100;
      if (reqQualitySpec && listQualitySpec && !listQualitySpec.includes(reqQualitySpec) && !reqQualitySpec.includes(listQualitySpec)) {
        cropQualityFit = 70;
      }

      // 2. Season Window Overlap (25%)
      let seasonFit = 100;
      const reqSeason = reqAttrs.seasonWindow;
      const listSeason = listAttrs.seasonWindow;
      if (reqSeason && listSeason) {
        if (reqSeason.start !== listSeason.start || reqSeason.end !== listSeason.end) {
          seasonFit = 80;
        }
      }

      // 3. Price Fit (20%)
      let priceScore = 100;
      if (reqBudget > 0 && listPrice > 0) {
        if (listPrice >= reqBudget) {
          priceScore = 100;
        } else {
          const diffPct = ((reqBudget - listPrice) / reqBudget) * 100;
          priceScore = Math.max(0, 100 - diffPct);
        }
      }

      // 4. Credibility Score (20%)
      const credibilityScore = listing.party?.credibility?.score ?? 50;

      // Weighted Composite Score
      const totalScore = Math.round(
        cropQualityFit * 0.35 +
        seasonFit * 0.25 +
        priceScore * 0.20 +
        credibilityScore * 0.20
      );

      scored.push({
        listingId: listing.id,
        title: listTitle,
        resourceType: listing.resourceType,
        district: listing.district,
        price: listPrice,
        score: totalScore,
        subScores: {
          cropQualityFit: Math.round(cropQualityFit),
          seasonFit: Math.round(seasonFit),
          price: Math.round(priceScore),
          credibility: Math.round(credibilityScore),
        },
        partyName: listing.party?.name || 'Contractor / Buyer',
        credibilityScore: Math.round(credibilityScore),
      });
    }

    return scored.sort((a, b) => b.score - a.score);
  }
}

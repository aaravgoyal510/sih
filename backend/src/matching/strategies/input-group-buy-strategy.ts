import { Requirement } from '@prisma/client';
import { MatchingStrategy, ListingWithParty, MatchCandidateResult } from '../matching-engine.interface';
import { getDistrictDistanceScore } from '../district-proximity';

export class InputGroupBuyStrategy implements MatchingStrategy {
  scoreCandidates(requirement: Requirement, candidates: ListingWithParty[]): MatchCandidateResult[] {
    const reqAttrs = (requirement.attributes as any) || {};
    const reqInputType = (reqAttrs.inputType || '').toLowerCase();
    const reqQty = Number(requirement.quantityNeeded || reqAttrs.targetQuantity || 0);
    const reqBudget = Number(requirement.budget || 0);

    const scored: MatchCandidateResult[] = [];

    for (const listing of candidates) {
      if (listing.resourceType !== 'INPUT_GROUP_BUY') continue;

      const listAttrs = (listing.attributes as any) || {};
      const listInputType = (listAttrs.inputType || '').toLowerCase();
      const listTargetQty = Number(listAttrs.targetQuantity || 0);
      const listPrice = Number(listing.price || 0);
      const listTitle = `Bulk ${listAttrs.inputType || 'Input'} Group Buy (Target: ${listTargetQty} units)`;

      // Filter out mismatched input types completely
      if (reqInputType && listInputType && !listInputType.includes(reqInputType) && !reqInputType.includes(listInputType)) {
        continue;
      }

      // 1. Input Type Fit (40%)
      const inputTypeFit = 100;

      // 2. Quantity / MOQ Contribution Fit (30%)
      let quantityFit = 100;
      if (listTargetQty > 0 && reqQty > 0) {
        // High fit if individual demand makes a meaningful contribution toward bulk target
        const contributionPct = (reqQty / listTargetQty) * 100;
        quantityFit = Math.min(100, Math.max(40, contributionPct * 2));
      }

      // 3. Price / Discount Fit (30%)
      let priceScore = 100;
      if (reqBudget > 0 && listPrice > 0) {
        if (listPrice <= reqBudget) {
          priceScore = 100;
        } else {
          const diffPct = ((listPrice - reqBudget) / reqBudget) * 100;
          priceScore = Math.max(0, 100 - diffPct);
        }
      }

      // Weighted Composite Score
      const totalScore = Math.round(
        inputTypeFit * 0.40 +
        quantityFit * 0.30 +
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
          inputTypeFit: Math.round(inputTypeFit),
          quantityFit: Math.round(quantityFit),
          price: Math.round(priceScore),
        },
        partyName: listing.party?.name || 'Input Supplier',
        credibilityScore: listing.party?.credibility?.score ?? 50,
      });
    }

    return scored.sort((a, b) => b.score - a.score);
  }
}

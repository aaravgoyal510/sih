import { Requirement } from '@prisma/client';
import { MatchingStrategy, MatchCandidateResult, ListingWithParty } from '../matching-engine.interface';
import { getDistrictDistanceScore } from '../district-proximity';

/**
 * UsedEquipmentMatchingStrategy (Per TechSpec.md §2.2):
 * Scores USED_EQUIPMENT listings against a USED_EQUIPMENT requirement.
 * Metric Weights:
 * - Machine Type Match: 40% (Tractor, Harvester, Rotavator, etc.)
 * - Condition Grade Fit: 30% (like_new > good > fair)
 * - Distance          : 15% (district proximity for inspection/transport)
 * - Price             : 15% (asking price vs budget)
 */
export class UsedEquipmentMatchingStrategy implements MatchingStrategy {
  private gradeRank: Record<string, number> = {
    like_new: 3,
    good: 2,
    fair: 1,
  };

  public scoreCandidates(requirement: Requirement, candidates: ListingWithParty[]): MatchCandidateResult[] {
    const reqAttrs = requirement.attributes as Record<string, any> || {};
    const reqMachineType = (reqAttrs.machineType || '').toString().toLowerCase();
    const reqConditionGrade = (reqAttrs.conditionGrade || 'fair').toString().toLowerCase();
    const reqGradeVal = this.gradeRank[reqConditionGrade] || 1;

    return candidates
      .map((candidate) => {
        const listingAttrs = candidate.attributes as Record<string, any> || {};
        const listingMachineType = (listingAttrs.machineType || '').toString().toLowerCase();
        const listingConditionGrade = (listingAttrs.conditionGrade || 'fair').toString().toLowerCase();
        const listingGradeVal = this.gradeRank[listingConditionGrade] || 1;

        // 1. Machine Type Match (40%)
        let machineTypeScore = 0;
        if (listingMachineType === reqMachineType) {
          machineTypeScore = 100;
        } else if (listingMachineType.includes(reqMachineType) || reqMachineType.includes(listingMachineType)) {
          machineTypeScore = 75;
        } else {
          machineTypeScore = 0;
        }

        // 2. Condition Grade Fit (30%)
        let conditionScore = 100;
        if (listingGradeVal >= reqGradeVal) {
          conditionScore = 100;
        } else if (listingGradeVal === reqGradeVal - 1) {
          conditionScore = 70;
        } else {
          conditionScore = 40;
        }

        // 3. Distance Score (15%)
        const distanceScore = getDistrictDistanceScore(requirement.district, candidate.district);

        // 4. Price Fit (15%)
        let priceScore = 100;
        if (candidate.price && requirement.budget) {
          if (candidate.price <= requirement.budget) {
            priceScore = 100;
          } else {
            const overBudgetPct = ((candidate.price - requirement.budget) / requirement.budget) * 100;
            priceScore = Math.max(0, Math.round(100 - overBudgetPct * 2));
          }
        }

        // Composite Weighted Score
        const totalScore = Math.round(
          machineTypeScore * 0.4 + conditionScore * 0.3 + distanceScore * 0.15 + priceScore * 0.15
        );

        return {
          listing: candidate,
          score: totalScore,
          scoreBreakdown: {
            machineTypeMatch: machineTypeScore,
            conditionGradeFit: conditionScore,
            distance: distanceScore,
            price: priceScore,
          },
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}

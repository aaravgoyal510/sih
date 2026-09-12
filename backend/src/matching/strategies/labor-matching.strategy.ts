import { Requirement } from '@prisma/client';
import { MatchingStrategy, MatchCandidateResult, ListingWithParty } from '../matching-engine.interface';
import { getDistrictDistanceScore } from '../district-proximity';

/**
 * LaborMatchingStrategy (Per TechSpec.md §2.2):
 * Scores LABOR listings against a LABOR requirement.
 * Metric Weights:
 * - Crew Size Fit  : 40% (capacity match)
 * - Task Type Match: 30% (harvesting, weeding, pruning, sowing, etc.)
 * - Distance       : 20% (district proximity)
 * - Price          : 10% (daily worker rate vs budget)
 */
export class LaborMatchingStrategy implements MatchingStrategy {
  public scoreCandidates(requirement: Requirement, candidates: ListingWithParty[]): MatchCandidateResult[] {
    const reqAttrs = requirement.attributes as Record<string, any> || {};
    const reqCrewSize = Number(reqAttrs.crewSize) || 1;
    const reqTaskType = (reqAttrs.taskType || '').toString().toLowerCase();

    return candidates
      .map((candidate) => {
        const listingAttrs = candidate.attributes as Record<string, any> || {};
        const listingCrewSize = Number(listingAttrs.crewSize) || 1;
        const listingTaskType = (listingAttrs.taskType || '').toString().toLowerCase();

        // 1. Crew Size Fit (40%)
        let crewSizeScore = 100;
        if (listingCrewSize >= reqCrewSize) {
          crewSizeScore = 100;
        } else {
          crewSizeScore = Math.max(0, Math.round((listingCrewSize / reqCrewSize) * 100));
        }

        // 2. Task Type Match (30%)
        let taskTypeScore = 0;
        if (listingTaskType === reqTaskType) {
          taskTypeScore = 100;
        } else if (listingTaskType.includes(reqTaskType) || reqTaskType.includes(listingTaskType)) {
          taskTypeScore = 75;
        } else {
          taskTypeScore = 30; // Generic labor fallback
        }

        // 3. Distance Score (20%)
        const distanceScore = getDistrictDistanceScore(requirement.district, candidate.district);

        // 4. Price Fit (10%)
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
          crewSizeScore * 0.4 + taskTypeScore * 0.3 + distanceScore * 0.2 + priceScore * 0.1
        );

        return {
          listingId: candidate.id,
          title: `${listingCrewSize} person crew: ${listingTaskType}`,
          resourceType: candidate.resourceType,
          district: candidate.district,
          price: candidate.price || 0,
          partyName: candidate.party.name,
          credibilityScore: candidate.party.credibility?.score || 50,
          score: totalScore,
          subScores: {
            crewSizeFit: crewSizeScore,
            taskTypeMatch: taskTypeScore,
            distance: distanceScore,
            price: priceScore,
          },
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}

import { Requirement } from '@prisma/client';
import { MatchingStrategy, ListingWithParty, MatchCandidateResult } from '../matching-engine.interface';
import { getDistrictDistanceScore } from '../district-proximity';

export class EquipmentMatchingStrategy implements MatchingStrategy {
  scoreCandidates(requirement: Requirement, candidates: ListingWithParty[]): MatchCandidateResult[] {
    const reqAttrs = (requirement.attributes as any) || {};
    const reqMachineType = (reqAttrs.machineType || '').toLowerCase();
    const reqPackageType = (reqAttrs.packageType || '').toLowerCase();
    const reqIncludesOperator = reqAttrs.includesOperator !== undefined ? Boolean(reqAttrs.includesOperator) : true;
    const reqBudget = Number(requirement.budget || 0);

    const scored: MatchCandidateResult[] = [];

    for (const listing of candidates) {
      if (listing.resourceType !== 'EQUIPMENT_SERVICE') continue;

      const listAttrs = (listing.attributes as any) || {};
      const listMachineType = (listAttrs.machineType || '').toLowerCase();
      const listPackageType = (listAttrs.packageType || '').toLowerCase();
      const listIncludesOperator = Boolean(listAttrs.includesOperator);
      const listPrice = Number(listing.price || 0);
      const listTitle = `${listAttrs.machineType || 'Equipment'} Service (${listAttrs.packageType || 'Standard'})`;

      // Filter out mismatched machine types completely
      if (reqMachineType && listMachineType && !listMachineType.includes(reqMachineType) && !reqMachineType.includes(listMachineType)) {
        continue;
      }

      // 1. Package & Machine Fit (40%)
      let packageFit = 100;
      if (reqPackageType && listPackageType && reqPackageType !== listPackageType) {
        packageFit = 75;
      }
      if (reqIncludesOperator && !listIncludesOperator) {
        packageFit -= 20; // Penalty if operator requested but not included
      }

      // 2. Distance Score (30%)
      const distanceScore = getDistrictDistanceScore(requirement.district, listing.district);

      // 3. Price Fit (30%)
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
        packageFit * 0.40 +
        distanceScore * 0.30 +
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
          packageFit: Math.round(packageFit),
          distance: Math.round(distanceScore),
          price: Math.round(priceScore),
        },
        partyName: listing.party?.name || 'Equipment Provider',
        credibilityScore: listing.party?.credibility?.score ?? 50,
      });
    }

    return scored.sort((a, b) => b.score - a.score);
  }
}

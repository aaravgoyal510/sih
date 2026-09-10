import { Listing, Requirement, Party } from '@prisma/client';

export type ListingWithParty = Listing & {
  party: Party & {
    credibility?: {
      score: number;
    } | null;
  };
};

export interface MatchSubScores {
  [key: string]: number; // e.g. qualityFit, quantityFit, distance, credibility, price
}

export interface MatchCandidateResult {
  listingId: string;
  title: string;
  resourceType: string;
  district: string;
  price: number;
  score: number; // 0 to 100 total composite score
  subScores: MatchSubScores;
  partyName: string;
  credibilityScore: number;
}

export interface MatchingStrategy {
  scoreCandidates(
    requirement: Requirement,
    candidates: ListingWithParty[]
  ): MatchCandidateResult[];
}

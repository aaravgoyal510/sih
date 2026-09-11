import { Requirement, ResourceType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { MatchingStrategy, MatchCandidateResult, ListingWithParty } from './matching-engine.interface';
import { CropLotMatchingStrategy } from './strategies/crop-lot-matching.strategy';
import { StorageMatchingStrategy } from './strategies/storage-matching.strategy';
import { TransportMatchingStrategy } from './strategies/transport-matching.strategy';
import { EquipmentMatchingStrategy } from './strategies/equipment-matching.strategy';
import { InputGroupBuyStrategy } from './strategies/input-group-buy-strategy';
import { ContractFarmingStrategy } from './strategies/contract-farming-strategy';
import { LaborMatchingStrategy } from './strategies/labor-matching.strategy';
import { UsedEquipmentMatchingStrategy } from './strategies/used-equipment-matching.strategy';

export class MatchingEngine {
  private strategies: Map<ResourceType, MatchingStrategy> = new Map();

  constructor() {
    this.strategies.set(ResourceType.CROP_LOT, new CropLotMatchingStrategy());
    this.strategies.set(ResourceType.COLD_STORAGE, new StorageMatchingStrategy());
    this.strategies.set(ResourceType.TRANSPORT, new TransportMatchingStrategy());
    this.strategies.set(ResourceType.EQUIPMENT_SERVICE, new EquipmentMatchingStrategy());
    this.strategies.set(ResourceType.INPUT_GROUP_BUY, new InputGroupBuyStrategy());
    this.strategies.set(ResourceType.CONTRACT_FARMING, new ContractFarmingStrategy());
    this.strategies.set(ResourceType.LABOR, new LaborMatchingStrategy());
    this.strategies.set(ResourceType.USED_EQUIPMENT, new UsedEquipmentMatchingStrategy());
  }

  /**
   * Dispatches requirement to the strategy corresponding to its resourceType
   * and scores all active candidate listings.
   */
  public async matchRequirement(requirement: Requirement): Promise<MatchCandidateResult[]> {
    if(requirement.deadline&&requirement.deadline<=new Date())return [];
    const strategy = this.strategies.get(requirement.resourceType);
    if (!strategy) {
      throw new Error(`No matching strategy registered for resourceType: ${requirement.resourceType}`);
    }

    // Fetch active OPEN candidates for this resource type from Supabase DB
    const candidates = (await prisma.listing.findMany({
      where: {
        resourceType: requirement.resourceType,
        status: 'OPEN',
        partyId: { not: requirement.partyId },
        party:{OR:[{credibility:null},{credibility:{suspended:false}}]},
        OR:[{availableTo:null},{availableTo:{gt:new Date()}}],
      },
      include: {
        party: {
          include: {
            credibility: true,
          },
        },
      },
      orderBy:{createdAt:'desc'},
      take:500,
    })) as ListingWithParty[];

    return strategy.scoreCandidates(requirement, candidates);
  }

  /**
   * Pure scoring method against an explicit array of candidates (useful for unit tests & offline evaluation)
   */
  public scoreCandidates(requirement: Requirement, candidates: ListingWithParty[]): MatchCandidateResult[] {
    const strategy = this.strategies.get(requirement.resourceType);
    if (!strategy) {
      throw new Error(`No matching strategy registered for resourceType: ${requirement.resourceType}`);
    }

    return strategy.scoreCandidates(requirement, candidates);
  }
}

export const matchingEngine = new MatchingEngine();

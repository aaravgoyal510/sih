import { prisma } from '../config/prisma';
import { PortalAdapter, SyncResult } from './portal-adapter.interface';

export interface NabardFpoRecord {
  cinOrRegNo: string;
  fpoName: string;
  state: string;
  district: string;
  registrationDate: string;
  memberCount: number;
  promoterAgency: 'NABARD' | 'SFAC' | 'NCDC' | 'MAHAFPC';
  cropClusters: string[];
  wdraAccredited: boolean;
  status: 'ACTIVE' | 'DORMANT' | 'UNDER_REVIEW';
  dataContractNote?: string;
}

export class NabardSfacAdapter implements PortalAdapter {
  public portalName = 'NABARD_SFAC';
  public tier = 3; // Tier 3 = Stubbed, architecture-ready per TechSpec.md §6

  /**
   * Documented data contract for Tier 3 NABARD/SFAC FPO Registry stub:
   * When NABARD / SFAC live APIs release production OpenAPI schemas, this method will query
   * the government registry endpoint: `https://sfacindia.com/api/v1/fpo/registry/verify`
   */
  public async lookupFpo(cinOrRegNo: string): Promise<NabardFpoRecord> {
    const regUpper = cinOrRegNo.toUpperCase().trim();

    // Write PortalSyncLog audit record whenever an FPO lookup occurs
    await prisma.portalSyncLog.create({
      data: {
        portal: 'NABARD_SFAC',
        tier: 3,
        status: 'STUBBED',
        message: `FPO registry verification lookup for Reg# '${regUpper}' (Stubbed Tier-3 response returned)`,
      },
    });

    // Return mock response matching official NABARD/SFAC FPO registry schema contract
    return {
      cinOrRegNo: regUpper,
      fpoName: `Maha Farmers Producer Co. Ltd. (${regUpper.slice(-6)})`,
      state: 'Maharashtra',
      district: 'Nashik',
      registrationDate: '2021-04-15',
      memberCount: 450,
      promoterAgency: 'SFAC',
      cropClusters: ['Onion', 'Grape', 'Pomegranate'],
      wdraAccredited: true,
      status: 'ACTIVE',
      dataContractNote: 'Tier 3 stubbed response matching SFAC/NABARD official FPO portal data contract (TechSpec.md §6).',
    };
  }

  /**
   * Common PortalAdapter.sync() method per TechSpec.md §6
   * Writes a PortalSyncLog entry with status=STUBBED and tier=3
   */
  public async sync(batchLimit: number = 100): Promise<SyncResult> {
    const summaryMessage = 'NABARD/SFAC FPO Registry stub adapter executed sync batch. Tier 3 architecture-ready.';

    try {
      await prisma.portalSyncLog.create({
        data: {
          portal: 'NABARD_SFAC',
          tier: 3,
          status: 'STUBBED',
          message: summaryMessage,
        },
      });

      return {
        portal: this.portalName,
        tier: this.tier,
        status: 'STUBBED',
        recordsFetched: 1,
        recordsIngested: 0,
        recordsSkipped: 0,
        message: summaryMessage,
      };
    } catch (err: any) {
      console.error('[NABARD_SFAC SYNC] Error creating PortalSyncLog:', err);
      return {
        portal: this.portalName,
        tier: this.tier,
        status: 'FAILED',
        recordsFetched: 0,
        recordsIngested: 0,
        recordsSkipped: 0,
        message: `NABARD/SFAC stub sync failed: ${err.message}`,
      };
    }
  }
}

export const nabardSfacAdapter = new NabardSfacAdapter();

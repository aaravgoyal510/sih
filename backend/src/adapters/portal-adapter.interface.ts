export interface SyncResult {
  portal: string;
  tier: number;
  status: 'SUCCESS' | 'FAILED' | 'STUBBED';
  recordsFetched: number;
  recordsIngested: number;
  recordsSkipped: number;
  message?: string;
}

export interface PortalAdapter {
  portalName: string;
  tier: number;
  sync(batchLimit?: number): Promise<SyncResult>;
}

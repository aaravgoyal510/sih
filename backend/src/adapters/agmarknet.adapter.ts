import { PortalAdapter, SyncResult } from './portal-adapter.interface';
import { liveMarket } from '../services/live-market.service';
export class AgmarknetAdapter implements PortalAdapter {
  portalName='AGMARKNET';tier=1;
  async sync(_batchLimit=2000):Promise<SyncResult>{
    const result=await liveMarket.get(true);
    return {portal:this.portalName,tier:this.tier,status:result.upstreamAvailable?'SUCCESS':'FAILED',recordsFetched:result.recordsFetched,recordsIngested:result.recordsIngested,recordsSkipped:0,message:result.warning||'Government prices fetched; recordsIngested counts newly saved market/crop/day revisions.'};
  }
}

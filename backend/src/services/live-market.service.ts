import { prisma } from '../config/prisma';
import { fetchAgmarknet, LIVE_SOURCE, MarketPrice } from '../adapters/agmarknet-feed';

type Dependencies={fetchFeed:typeof fetchAgmarknet;read:()=>Promise<any[]>;save:(prices:MarketPrice[])=>Promise<unknown>;log:(status:string,message:string)=>Promise<unknown>;now:()=>number};
export class LiveMarketService {
  private prices:MarketPrice[]=[];
  private pending:Promise<void>|null=null;
  private attempt=0;
  private fetchedAt:string|null=null;
  private failure:string|null=null;
  private partial=false;
  private recordsFetched=0;
  private recordsIngested=0;
  constructor(private deps:Dependencies){}
  async refresh(force=false){
    if(this.pending)return this.pending;
    const age=this.deps.now()-this.attempt;
    if(this.attempt&&age<(force||this.failure?60000:300000))return;
    this.attempt=this.deps.now();
    this.recordsIngested=0;this.recordsFetched=0;
    this.pending=(async()=>{
      try{
        const result=await this.deps.fetchFeed();
        const history=this.prices.length?this.prices:await this.deps.read().catch(()=>[]);
        this.prices=[...result.prices,...history.map((p:any)=>({...p,recordedAt:new Date(p.recordedAt).toISOString(),ingestedAt:new Date(p.ingestedAt).toISOString()}))].slice(0,10000);this.fetchedAt=new Date(this.deps.now()).toISOString();this.failure=null;this.partial=result.partial;this.recordsFetched=result.recordsFetched;
        try{const saved=await this.deps.save(result.prices) as {count?:number}|undefined;this.recordsIngested=saved?.count||0;}catch{this.failure='Live prices fetched, but database persistence failed. These observations remain available in memory.';}
        await this.deps.log('SUCCESS',`Live feed: ${result.recordsFetched} raw rows, ${result.prices.length} market/crop/day observations; partial=${result.partial}.`).catch(()=>{});
      }catch(e:any){
        this.failure=e.message||'Government price feed unavailable';
        await this.deps.log('FAILED',this.failure!).catch(()=>{});
      }
    })().finally(()=>{this.pending=null;});
    return this.pending;
  }
  async get(force=false){
    await this.refresh(force);
    let prices=this.prices;
    if(!prices.length){try{prices=(await this.deps.read()).map(p=>({...p,recordedAt:new Date(p.recordedAt).toISOString(),ingestedAt:new Date(p.ingestedAt).toISOString()}));this.prices=prices;}catch{this.failure=this.failure||'Saved feed observations are unavailable';}}
    const latest=new Map<string,MarketPrice>();
    for(const p of [...prices].sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt)||b.ingestedAt.localeCompare(a.ingestedAt))){const key=[p.crop,p.district,p.market,p.recordedAt].join('|');if(!latest.has(key))latest.set(key,p);}
    prices=[...latest.values()];const lastObservedAt=prices[0]?.recordedAt||null;
    const old=!lastObservedAt||this.deps.now()-Date.parse(lastObservedAt)>72*3600000;
    const mode=!prices.length?'unavailable':old?'stale':this.failure||!this.fetchedAt?'cached':'live';
    return {prices,mode,cached:mode!=='live',upstreamAvailable:!this.failure&&!!this.fetchedAt,source:LIVE_SOURCE,lastFetchedAt:this.fetchedAt,lastObservedAt,lastAttemptAt:this.attempt?new Date(this.attempt).toISOString():null,nextRefreshAt:new Date(this.attempt+(this.failure?60000:300000)).toISOString(),partial:this.partial,recordsFetched:this.recordsFetched,recordsIngested:this.recordsIngested,warning:this.failure||(old&&prices.length?'Latest reported prices are more than 72 hours old.':this.partial?'Feed coverage is partial; not all reported markets were retrieved.':null)};
  }
}
export const liveMarket=new LiveMarketService({
  fetchFeed:fetchAgmarknet,now:Date.now,
  read:()=>prisma.mandiPrice.findMany({where:{source:LIVE_SOURCE},orderBy:[{recordedAt:'desc'},{ingestedAt:'desc'}],take:5000}),
  save:prices=>prisma.mandiPrice.createMany({data:prices,skipDuplicates:true}),
  log:(status,message)=>prisma.portalSyncLog.create({data:{portal:'AGMARKNET',tier:1,status,message}}),
});

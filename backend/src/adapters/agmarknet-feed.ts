import { createHash } from 'node:crypto';

export const LIVE_SOURCE = 'AGMARKNET_LIVE';
export type MarketPrice = { id:string;crop:string;district:string;market:string;pricePerKg:number;source:string;recordedAt:string;ingestedAt:string };
export function normalizeRecords(records: any[], now = new Date()): MarketPrice[] {
  const grouped = new Map<string,{crop:string;district:string;market:string;date:string;prices:number[]}>();
  for (const row of records) {
    if (String(row.state || '').toLowerCase() !== 'maharashtra') continue;
    const crop=String(row.commodity||'').trim(),district=String(row.district||'').trim(),market=String(row.market||'').trim();
    const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(row.arrival_date||''));
    if (!parts || !crop || !district || !market) continue;
    const date=new Date(Date.UTC(+parts[3],+parts[2]-1,+parts[1]));
    if(date.getUTCDate()!==+parts[1]||date.getUTCMonth()!==+parts[2]-1||date.getUTCFullYear()!==+parts[3]||date.getTime()>now.getTime()+86400000)continue;
    const modal=Number(String(row.modal_price??'').replaceAll(',',''));
    if(!Number.isFinite(modal)||modal<=0)continue;
    const key=[crop.toLowerCase(),district.toLowerCase(),market.toLowerCase(),date.toISOString()].join('|');
    const group=grouped.get(key)||{crop,district,market,date:date.toISOString(),prices:[]};
    group.prices.push(modal/100);grouped.set(key,group);
  }
  return [...grouped.entries()].map(([key,g])=>{
    // The storage model is market/crop/day, not variety-level. State this mean in the UI.
    const pricePerKg=Number((g.prices.reduce((a,b)=>a+b,0)/g.prices.length).toFixed(4));
    return {id:'live-'+createHash('sha256').update(key+'|'+pricePerKg).digest('hex').slice(0,32),crop:g.crop,district:g.district,market:g.market,pricePerKg,source:LIVE_SOURCE,recordedAt:g.date,ingestedAt:now.toISOString()};
  });
}

export async function fetchAgmarknet(fetcher: typeof fetch = fetch) {
  const key=process.env.AGMARKNET_API_KEY;
  if(!key || /your.*key|replace|placeholder/i.test(key))throw new Error('AGMARKNET_API_KEY is missing or a placeholder');
  const records:any[]=[];const limit=500,maxPages=4;let total=0,partial=false;
  const signal=AbortSignal.timeout(20000);
  for(let page=0;page<maxPages;page++){
    const url=new URL('https://api.data.gov.in/resource/'+(process.env.AGMARKNET_RESOURCE_ID||'9ef84268-d588-465a-a308-a864a43d0070'));
    for(const [k,v] of Object.entries({'api-key':key,format:'json',limit:String(limit),offset:String(page*limit),'filters[state.keyword]':'Maharashtra'}))url.searchParams.set(k,v);
    let payload:any;
    for(let attempt=0;attempt<2;attempt++){
      try{
        const response=await fetcher(url,{signal,headers:{Accept:'application/json'}});
        if(!response.ok)throw new Error(`Government feed returned HTTP ${response.status}`);
        const parsed=await response.json();if(!Array.isArray(parsed.records))throw new Error('Government feed returned an invalid record payload');payload=parsed;
        break;
      }catch(error){if(attempt===1||signal.aborted){if(records.length){partial=true;break;}throw new Error(signal.aborted?'Government feed timed out':'Government feed unavailable (HTTP/network or invalid response)');}}
    }
    if(!payload)break;
    records.push(...payload.records);total=Number(payload.total)||0;
    if(payload.records.length<limit||(total>0&&records.length>=total))break;
    if(page===maxPages-1)partial=true;
  }
  const prices=normalizeRecords(records);
  if(!prices.length)throw new Error('Government feed returned no valid Maharashtra price observations');
  return {prices,recordsFetched:records.length,total,partial};
}

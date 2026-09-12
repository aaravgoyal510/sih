import assert from 'node:assert/strict';
import { fetchAgmarknet, normalizeRecords, LIVE_SOURCE } from '../adapters/agmarknet-feed';
import { LiveMarketService } from '../services/live-market.service';
import { prisma } from '../config/prisma';

async function main(){
 const now=Date.UTC(2026,8,12),row={state:'Maharashtra',commodity:'Onion',district:'Nashik',market:'Lasalgaon',arrival_date:'11/09/2026',modal_price:'1,900'};
 const prices=normalizeRecords([row,{...row,modal_price:'2100'}, {...row,state:'Punjab'}, {...row,arrival_date:'31/02/2026'}, {...row,modal_price:'bad'}, {...row,arrival_date:'11/09/2030'}],new Date(now));
 assert.equal(prices.length,1);assert.equal(prices[0].pricePerKg,20);assert.equal(prices[0].source,LIVE_SOURCE);assert.equal(prices[0].recordedAt,'2026-09-11T00:00:00.000Z');
 assert.equal(normalizeRecords([row,{...row,modal_price:'2100'}],new Date(now))[0].id,prices[0].id);
 let time=now,calls=0,saves=0,fail=false;const logs:string[]=[];
 const service=new LiveMarketService({now:()=>time,fetchFeed:async()=>{calls++;if(fail)throw new Error('Provider unavailable');return {prices,recordsFetched:2,total:2,partial:false};},read:async()=>[],save:async()=>{saves++;},log:async status=>{logs.push(status);}});
 const concurrent=await Promise.all([service.get(),service.get()]);assert.equal(calls,1);assert.equal(saves,1);assert.equal(concurrent[0].mode,'live');
 await service.get(true);assert.equal(calls,1,'manual refresh cooldown');time+=61000;await service.get(true);assert.equal(calls,2);
 fail=true;time+=301000;const fallback=await service.get();assert.equal(fallback.mode,'cached');assert.equal(fallback.prices.length,1);assert.equal(fallback.upstreamAvailable,false);assert.match(fallback.warning!,/unavailable/i);
 await service.get(true);assert.equal(calls,3,'failed fetch backoff');time+=4*86400000;assert.equal((await service.get()).mode,'stale');assert.ok(logs.includes('FAILED'));
 const empty=new LiveMarketService({now:()=>time,fetchFeed:async()=>{throw new Error('Offline');},read:async()=>[],save:async()=>{},log:async()=>{}});
 assert.equal((await empty.get()).mode,'unavailable');assert.equal((await empty.get()).prices.length,0);
 const originalKey=process.env.AGMARKNET_API_KEY;process.env.AGMARKNET_API_KEY='test-fixture-key';
 try{
  let attempts=0;
  const fetched=await fetchAgmarknet((async(url:any)=>{assert.equal(new URL(url).searchParams.get('filters[state.keyword]'),'Maharashtra');attempts++;if(attempts===1)return new Response('{}',{status:503});return Response.json({total:1,records:[{...row,arrival_date:new Date().toLocaleDateString('en-GB',{timeZone:'UTC'})}]});}) as typeof fetch);
  assert.equal(attempts,2);assert.equal(fetched.prices.length,1);
  await assert.rejects(()=>fetchAgmarknet((async()=>Response.json({error:'invalid'})) as typeof fetch),/unavailable/);
 }finally{if(originalKey===undefined)delete process.env.AGMARKNET_API_KEY;else process.env.AGMARKNET_API_KEY=originalKey;}
 console.log('PASS: normalization, units, invalid dates, stable IDs, single-flight, cooldown, retries, cached/stale/unavailable states. No fixture data written to the database.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());

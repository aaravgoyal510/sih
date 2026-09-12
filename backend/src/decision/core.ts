import {createHash} from 'node:crypto';
export class DecisionError extends Error {constructor(public status:number,message:string){super(message);}}
export function requireDecision(value:unknown,status:number,message:string):asserts value {if(!value)throw new DecisionError(status,message);}
export function canonical(value:any):string {
 if(value instanceof Date)return JSON.stringify(value.toISOString());
 if(typeof value==='bigint')return JSON.stringify(value.toString());
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export const hash=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
export function jsonSafe<T=any>(value:any):T {return JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='bigint'?safe(v):v));}
export function safe(value:bigint):number {requireDecision(value<=BigInt(Number.MAX_SAFE_INTEGER)&&value>=BigInt(Number.MIN_SAFE_INTEGER),400,'Amount exceeds supported precision.');return Number(value);}
export function decimalUnits(value:string|number,places:number):bigint {
 const text=String(value);requireDecision(/^\d+(\.\d+)?$/.test(text),400,'Use a positive decimal quantity or rate.');
 const [whole,fraction='']=text.split('.');requireDecision(fraction.length<=places,400,`Use at most ${places} decimal places.`);
 const result=BigInt(whole)*10n**BigInt(places)+BigInt(fraction.padEnd(places,'0')||'0');safe(result);return result;
}
export function quantityGrams(value:string|number,unit:'kg'|'quintal'|'tonne'='kg'){const result=decimalUnits(value,3)*({kg:1n,quintal:100n,tonne:1000n}[unit]);requireDecision(result>0n&&result<=1000000000000n,400,'Quantity is outside supported limits.');return result;}
export function rounded(n:bigint,d:bigint):bigint {requireDecision(n>=0n&&d>0n,400,'Invalid nonnegative arithmetic.');return (n+d/2n)/d;}
export const COST_KEYS=['transport','storage','handling','commission','spoilage','financing'] as const;
export type CostKey=typeof COST_KEYS[number];
export type Costs=Record<CostKey,number>;
export type CostEvidence={amountPaise?:number;quoteId?:string;basis?:string};
export type Candidate={
 id:string;buyerId:string;name:string;route:string;quantityGrams:bigint;unitPricePaise:bigint;
 origin:string;destination:string;startAt:Date;endAt:Date;paymentDueAt:Date;validUntil:Date;
 verified:boolean;suspended:boolean;available:boolean;grade:string;providerAvailable:boolean;
 criticalMarketAt?:Date|null;costs:Partial<Costs>;costSources:Record<string,unknown>;
 trust:any;fingerprint:string;evidence:any;missing?:string[];exclusions?:string[];
};
export type Scenario={quantityGrams:bigint;grade:string;origin:string;harvestAt:Date;cashDeadline:Date|null;baselineQuoteId?:string;now:Date};
export function evaluateCandidate(c:Candidate,s:Scenario){
 const excluded=[...(c.exclusions||[])],missing=[...(c.missing||[])];
 if(c.suspended)excluded.push('BUYER_SUSPENDED');if(!c.verified)excluded.push('BUYER_VERIFICATION_INVALID');
 if(!c.available)excluded.push('INVENTORY_OR_DEMAND_UNAVAILABLE');if(!c.providerAvailable)excluded.push('PROVIDER_UNAVAILABLE');
 if(c.quantityGrams!==s.quantityGrams)excluded.push('SAME_LOT_QUANTITY_MISMATCH');if(c.grade!==s.grade)excluded.push('GRADE_MISMATCH');
 if(c.validUntil<=s.now)excluded.push('QUOTE_EXPIRED');if(c.endAt<s.harvestAt||c.startAt<s.harvestAt)excluded.push('BEFORE_HARVEST');
 if(c.startAt<s.now)excluded.push('PICKUP_WINDOW_STARTED');if(s.cashDeadline&&c.paymentDueAt>s.cashDeadline)excluded.push('CASH_DEADLINE_MISSED');
 if(c.origin.trim().toLowerCase()!==s.origin.trim().toLowerCase())excluded.push('ORIGIN_MISMATCH');
 if(c.criticalMarketAt!==undefined&&(!c.criticalMarketAt||s.now.getTime()-c.criticalMarketAt.getTime()>72*3600000))excluded.push('CRITICAL_MARKET_EVIDENCE_STALE');
 if(!c.destination)missing.push('destination');
 for(const key of COST_KEYS){const value=c.costs[key];if(value===undefined)missing.push(`costs.${c.id}.${key}`);else requireDecision(Number.isSafeInteger(value)&&value>=0,400,`Invalid ${key} cost.`);}
 requireDecision(c.unitPricePaise>0n,400,'Sale price must be positive.');
 if(excluded.length||missing.length)return {candidate:c,excluded:[...new Set(excluded)],missing:[...new Set(missing)],ready:false as const};
 const gross=rounded(c.quantityGrams*c.unitPricePaise,1000n),totalCost=COST_KEYS.reduce((n,k)=>n+BigInt(c.costs[k]!),0n);
 return {candidate:c,excluded:[],missing:[],ready:true as const,grossPaise:safe(gross),costPaise:safe(totalCost),netPaise:safe(gross-totalCost)};
}
export function compareCandidates(candidates:Candidate[],scenario:Scenario){
 const evaluated=candidates.map(c=>evaluateCandidate(c,scenario));
 const feasible=evaluated.filter((c):c is Extract<typeof c,{ready:true}>=>c.ready);
 const diagnostics=evaluated.filter(c=>!c.ready).map(c=>({quoteId:c.candidate.id,excluded:c.excluded,missing:c.missing}));
 if(!feasible.length)return {status:diagnostics.some(d=>!d.excluded.length&&d.missing.length)?'NEEDS_INPUT':'UNAVAILABLE',diagnostics,ranked:[],baseline:null};
 const sort=(a:typeof feasible[number],b:typeof feasible[number])=>b.netPaise-a.netPaise||Number(a.candidate.trust?.provisional??true)-Number(b.candidate.trust?.provisional??true)||a.candidate.paymentDueAt.getTime()-b.candidate.paymentDueAt.getTime()||a.candidate.id.localeCompare(b.candidate.id);
 feasible.sort(sort);
 const earliest=Math.min(...feasible.map(c=>c.candidate.startAt.getTime()));
 const sellNow=feasible.filter(c=>c.candidate.startAt.getTime()<=Math.max(scenario.now.getTime(),scenario.harvestAt.getTime(),earliest)+24*3600000);
 const local=sellNow.filter(c=>c.candidate.destination.trim().toLowerCase()===scenario.origin.trim().toLowerCase());
 const baseline=scenario.baselineQuoteId?feasible.find(c=>c.candidate.id===scenario.baselineQuoteId):(local.length?local:sellNow).sort(sort)[0];
 if(!baseline)return {status:'NEEDS_INPUT',diagnostics:[...diagnostics,{quoteId:scenario.baselineQuoteId!,excluded:[],missing:['feasibleBaselineQuoteId']}],ranked:[],baseline:null};
 // A later sale cannot be silently selected as a sell-now baseline.
 if(!sellNow.includes(baseline))return {status:'NEEDS_INPUT',diagnostics:[...diagnostics,{quoteId:baseline.candidate.id,excluded:[],missing:['sellNowBaselineQuoteId']}],ranked:[],baseline:null};
 return {status:'READY',diagnostics,baseline,ranked:feasible.map(c=>({...c,deltaPaise:safe(BigInt(c.netPaise)-BigInt(baseline.netPaise))}))};
}
/** Deterministic largest-remainder allocation. Every paise is allocated once. */
export function allocatePaise(total:number,members:{id:string;grams:bigint}[]){
 requireDecision(Number.isSafeInteger(total)&&total>=0&&members.length>0&&new Set(members.map(m=>m.id)).size===members.length&&members.every(m=>m.grams>0n),400,'Invalid pool allocation.');
 const denominator=members.reduce((s,m)=>s+m.grams,0n);
 const portions=members.map(m=>({id:m.id,amount:BigInt(total)*m.grams/denominator,remainder:BigInt(total)*m.grams%denominator}));
 let left=BigInt(total)-portions.reduce((s,m)=>s+m.amount,0n);
 portions.sort((a,b)=>a.remainder===b.remainder?a.id.localeCompare(b.id):a.remainder>b.remainder?-1:1);
 for(const p of portions){if(left<=0n)break;p.amount++;left--;}
 return Object.fromEntries(portions.map(p=>[p.id,safe(p.amount)]));
}
export function hypotheticalWait(input:{horizonDays:number;lowPricePaise:number;centralPricePaise:number;highPricePaise:number;costs:Costs;uncertainty:string},grams:bigint,currentNet:number){
 requireDecision(Number.isInteger(input.horizonDays)&&input.horizonDays>0&&input.horizonDays<=90&&input.uncertainty.trim().length>=5,400,'Give a bounded waiting horizon and named uncertainty.');
 const rates=[input.lowPricePaise,input.centralPricePaise,input.highPricePaise];requireDecision(rates.every(n=>Number.isSafeInteger(n)&&n>0)&&rates[0]<=rates[1]&&rates[1]<=rates[2],400,'Waiting scenario prices must be ordered positive integer paise.');
 requireDecision(COST_KEYS.every(k=>Number.isSafeInteger(input.costs[k])&&input.costs[k]>=0),400,'All hypothetical waiting costs must be explicit, including zero.');
 const cost=COST_KEYS.reduce((s,k)=>s+BigInt(input.costs[k]),0n);
 const deltas=rates.map(rate=>safe(rounded(grams*BigInt(rate),1000n)-cost-BigInt(currentNet)));
 return {status:'HYPOTHETICAL',horizonDays:input.horizonDays,expectedDeltaPaise:deltas[1],downsidePaise:deltas[0],upsidePaise:deltas[2],riskFactor:input.uncertainty,riskChange:'unknown',basis:'Farmer-entered price scenario, not an AI forecast. Weather risk unknown.',costs:input.costs};
}

import assert from 'node:assert/strict';
import {Candidate,COST_KEYS,allocatePaise,compareCandidates,decimalUnits,evaluateCandidate,hypotheticalWait,quantityGrams} from '../decision/core';
import {summarizeOutcomes} from '../decision/outcomes';
const now=new Date('2030-01-01T00:00:00Z');
const zero={transport:0,storage:0,handling:0,commission:0,spoilage:0,financing:0};
const scenario={now,quantityGrams:1000000n,grade:'A',origin:'Nashik',harvestAt:now,cashDeadline:null};
function candidate(id:string,overrides:Partial<Candidate>={}):Candidate{return {id,buyerId:id,name:id,route:'BUYER',quantityGrams:1000000n,unitPricePaise:2400n,origin:'Nashik',destination:'Nashik',startAt:new Date('2030-01-01T01:00:00Z'),endAt:new Date('2030-01-01T02:00:00Z'),paymentDueAt:new Date('2030-01-02T00:00:00Z'),validUntil:new Date('2030-01-01T00:30:00Z'),verified:true,suspended:false,available:true,grade:'A',providerAvailable:true,costs:{...zero,transport:100000},costSources:{},trust:{provisional:true,score:50},fingerprint:id,evidence:{},...overrides};}
const local=candidate('local'),better=candidate('farther',{unitPricePaise:2800n,destination:'Pune',costs:{...zero,transport:150000,handling:65000}});
let count=0;function check(fn:()=>void){fn();count++;}
check(()=>assert.equal(quantityGrams('20','quintal'),2000000n));
check(()=>assert.equal(quantityGrams('2','tonne'),2000000n));
check(()=>assert.equal(quantityGrams('0.001'),1n));
check(()=>assert.throws(()=>quantityGrams('1.0001')));
check(()=>assert.throws(()=>quantityGrams(-1)));
check(()=>assert.equal(decimalUnits('23.01',2),2301n));
check(()=>{const result=compareCandidates([local,better],scenario);assert.equal(result.status,'READY');assert.equal(result.ranked[0].netPaise,2585000);assert.equal(result.ranked[0].deltaPaise,285000);assert.equal(result.baseline?.netPaise,2300000);});
check(()=>{const expensive=candidate('highest',{unitPricePaise:3000n,destination:'Mumbai',costs:{...zero,transport:800000}});assert.equal(compareCandidates([local,expensive],scenario).ranked[0].candidate.id,'local');});
for(const [field,value,reason] of [['suspended',true,'BUYER_SUSPENDED'],['verified',false,'BUYER_VERIFICATION_INVALID'],['available',false,'INVENTORY_OR_DEMAND_UNAVAILABLE'],['providerAvailable',false,'PROVIDER_UNAVAILABLE'],['grade','B','GRADE_MISMATCH'],['quantityGrams',999000n,'SAME_LOT_QUANTITY_MISMATCH'],['validUntil',now,'QUOTE_EXPIRED'],['criticalMarketAt',new Date('2029-12-20'),'CRITICAL_MARKET_EVIDENCE_STALE']] as const){check(()=>{const result=evaluateCandidate(candidate('bad',{[field]:value}),scenario);assert.equal(result.ready,false);assert.ok(result.excluded.includes(reason));});}
check(()=>assert.equal(compareCandidates([candidate('missing',{costs:{transport:0}})],scenario).status,'NEEDS_INPUT'));
check(()=>assert.equal(compareCandidates([candidate('bad',{suspended:true,costs:{}})],scenario).status,'UNAVAILABLE'));
check(()=>assert.throws(()=>evaluateCandidate(candidate('bad',{costs:{...zero,handling:-1}}),scenario)));
check(()=>assert.throws(()=>evaluateCandidate(candidate('bad',{costs:{...zero,handling:0.5}}),scenario)));
check(()=>assert.throws(()=>evaluateCandidate(candidate('bad',{unitPricePaise:100000000000000000n}),scenario)));
check(()=>assert.equal(evaluateCandidate(candidate('one-gram',{quantityGrams:1n,unitPricePaise:500n,costs:zero}),{...scenario,quantityGrams:1n}).ready,true));
check(()=>assert.equal(compareCandidates([local],{...scenario,baselineQuoteId:'absent'}).status,'NEEDS_INPUT'));
check(()=>assert.equal(compareCandidates([local],{...scenario,cashDeadline:now}).status,'UNAVAILABLE'));
check(()=>{const wait=hypotheticalWait({horizonDays:3,lowPricePaise:2300,centralPricePaise:2500,highPricePaise:2700,costs:{...zero,storage:50000},uncertainty:'Future rainfall unknown'},1000000n,2300000);assert.equal(wait.status,'HYPOTHETICAL');assert.equal(wait.downsidePaise,-50000);assert.equal(wait.expectedDeltaPaise,150000);});
for(let n=1;n<=100;n++){check(()=>{const members=[{id:'a',grams:BigInt(n)},{id:'b',grams:23n},{id:'c',grams:81n}];const total=n*103+1,result=allocatePaise(total,members);assert.equal(Object.values(result).reduce((s,v)=>s+v,0),total);assert.deepEqual(result,allocatePaise(total,[...members].reverse()));});}
check(()=>assert.throws(()=>allocatePaise(-1,[{id:'a',grams:1n}])));
check(()=>assert.throws(()=>allocatePaise(10,[{id:'a',grams:1n},{id:'a',grams:2n}])));
const events:any[]=[{id:'receipt',kind:'PAYMENT_RECEIVED',actorId:'farmer',simulation:false,amountPaise:2585000n,payload:{payeePartyId:'farmer'}}];
check(()=>assert.equal(summarizeOutcomes(events,'farmer',2500000,true).realized.netPaise,null));
events.push({id:'confirm',kind:'CONFIRM',actorId:'buyer',simulation:false,relatedEventId:'receipt',payload:{payeePartyId:'farmer'}});
for(const key of COST_KEYS){const id='cost-'+key;events.push({id,kind:key.toUpperCase()+'_COST',actorId:'farmer',simulation:false,amountPaise:0n,payload:{payeePartyId:'farmer'}},{id:'confirm-'+key,kind:'CONFIRM',actorId:'buyer',simulation:false,relatedEventId:id,payload:{payeePartyId:'farmer'}});}
events.push({id:'complete',kind:'COSTS_COMPLETE',actorId:'farmer',simulation:false,payload:{payeePartyId:'farmer'}},{id:'complete-confirm',kind:'CONFIRM',actorId:'buyer',simulation:false,relatedEventId:'complete',payload:{payeePartyId:'farmer'}});
check(()=>{const result=summarizeOutcomes(events,'farmer',2500000,true);assert.equal(result.realized.status,'EVIDENCED');assert.equal(result.realized.netPaise,2585000);assert.equal(result.realized.deltaVsExpectedPaise,85000);});
check(()=>{const simulated=events.map(e=>({...e,simulation:true}));assert.equal(summarizeOutcomes(simulated,'farmer',2500000,true).realized.netPaise,null);assert.equal(summarizeOutcomes(simulated,'farmer',2500000,true).simulation.netPaise,2585000);});
check(()=>{const corrected=[...events,{id:'reverse',kind:'REVERSE',actorId:'farmer',simulation:false,relatedEventId:'receipt'},{id:'reverse-confirm',kind:'CONFIRM',actorId:'buyer',simulation:false,relatedEventId:'reverse'}];assert.equal(summarizeOutcomes(corrected,'farmer',2500000,true).realized.netPaise,null);});
console.log(`PASS: ${count} decision arithmetic, feasibility, missing-input, baseline, deterministic allocation and evidence-separation checks.`);

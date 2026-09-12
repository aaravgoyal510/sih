import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {COST_KEYS,CostEvidence,DecisionError,Scenario,compareCandidates,hash,hypotheticalWait,jsonSafe,quantityGrams,requireDecision,safe} from './core';
import {DecisionDb,candidateFromQuote,lotSnapshot,providerEligible,quoteHash,quoteInclude,quoteSnapshot} from './evidence';
import {recomputeTrustBatch} from './trust';
const money=z.number().int().min(0).max(1e14);
const cost=z.object({amountPaise:money.optional(),quoteId:z.string().uuid().optional(),basis:z.string().trim().min(3).max(300).optional(),availabilityConfirmed:z.boolean().optional()}).refine(v=>(v.amountPaise!==undefined)!==!!v.quoteId,'Enter a cost or select a provider quote, not both.').refine(v=>v.amountPaise===undefined||!!v.basis,'Explain the farmer-entered cost, including zero.');
const costs=z.object({transport:cost.optional(),storage:cost.optional(),handling:cost.optional(),commission:cost.optional(),spoilage:cost.optional(),financing:cost.optional()});
export const comparisonInput=z.object({
 listingId:z.string().uuid(),clientRequestId:z.string().uuid(),quantity:z.object({value:z.union([z.number(),z.string()]),unit:z.enum(['kg','quintal','tonne'])}).optional(),
 harvestAt:z.string().datetime().optional(),cashDeadline:z.string().datetime().nullable().optional(),baselineQuoteId:z.string().uuid().optional(),
 costs:z.record(z.string().uuid(),costs).default({}),shareWithFpo:z.boolean().default(false),
 wait:z.object({horizonDays:z.number().int().min(1).max(90),lowPricePaise:money,centralPricePaise:money,highPricePaise:money,costs:z.object({transport:money,storage:money,handling:money,commission:money,spoilage:money,financing:money}),uncertainty:z.string().min(5).max(300),storageQuoteId:z.string().uuid()}).optional(),
});
export function recommendationView(r:any){return jsonSafe({id:r.id,synthetic:false,persisted:true,createdAt:r.createdAt,validUntil:r.validUntil,explanationVersion:r.explanationVersion,formulaVersion:r.formulaVersion,status:r.scenarioStatus||'LEGACY_ESTIMATE',what:r.what,why:r.why,risk:{level:r.risk==='HIGH'?'High':r.risk==='LOW'?'Low':'Medium',basis:r.riskBasis},what_if_wait:r.what_if_wait,buyerTrust:r.trustSnapshot||null,selection:r.selection||null,quoteId:r.quoteId,listingId:r.listingId,poolPlanId:r.poolPlanId,inputSnapshot:r.inputSnapshot,sharedFpoId:r.sharedFpoId});}
export async function authorizedRecommendation(tx:DecisionDb,id:string,actor:any){
 const r=await tx.recommendation.findUnique({where:{id},include:{selection:true,farmer:{select:{fpoId:true}}}});
 requireDecision(r&&(r.farmerPartyId===actor.id||(actor.roles.includes('FPO_ADMIN')&&actor.fpoId&&r.sharedFpoId===actor.fpoId&&r.farmer.fpoId===actor.fpoId)),404,'Decision not found.');return r;
}
export async function generateComparison(tx:DecisionDb,actor:any,raw:unknown){
 const started=Date.now(),input=comparisonInput.parse(raw),inputHash=hash(input),now=new Date();
 const previous=await tx.decisionRun.findUnique({where:{farmerPartyId_requestKey:{farmerPartyId:actor.id,requestKey:input.clientRequestId}},include:{recommendations:{include:{selection:true}}}});
 if(previous){requireDecision(previous.inputHash===inputHash,409,'This comparison request already used different inputs.');return runView(previous);}
 const lot=await tx.listing.findUnique({where:{id:input.listingId},include:{party:{include:{credibility:true}}}});
 requireDecision(lot&&lot.partyId===actor.id&&['FARMER','FPO_ADMIN'].some(r=>actor.roles.includes(r)),403,'Choose a crop lot you own.');
 requireDecision(lot.resourceType==='CROP_LOT',400,'A crop lot is required.');
 const missing:string[]=[],excluded:any[]=[],a=lot.attributes as any;
 if(!a.qualityGrade)missing.push('qualityGrade');if(!lot.district.trim())missing.push('location');if(!input.harvestAt)missing.push('harvestAt');if(input.cashDeadline===undefined)missing.push('cashDeadline');
 const grams=input.quantity?quantityGrams(input.quantity.value,input.quantity.unit):quantityGrams(a.quantityKg);
 requireDecision(grams<=quantityGrams(a.quantityKg),400,'Comparison quantity exceeds this lot.');
 if(a.isPooled)requireDecision(grams===quantityGrams(a.quantityKg),400,'Compare a pooled lot in full.');
 if(lot.status!=='OPEN'||lot.party.credibility?.suspended)excluded.push({code:'LOT_UNAVAILABLE'});
 const runId=randomUUID();let status=excluded.length?'UNAVAILABLE':missing.length?'NEEDS_INPUT':'READY';let recommendations:any[]=[];
 let diagnostics:any={missingInputs:missing,excluded,coverage:'Latest 30 sale quotes and 60 provider quotes for this lot. No ranking of raw mandi observations.'};
 if(status==='READY'){
  const quotes=await tx.decisionQuote.findMany({where:{listingId:lot.id,kind:'SALE'},include:quoteInclude,orderBy:{createdAt:'desc'},take:30});
  const serviceQuotes=await tx.decisionQuote.findMany({where:{listingId:lot.id,kind:{in:['TRANSPORT','STORAGE']}},include:quoteInclude,orderBy:{createdAt:'desc'},take:60});
  const providers=new Map(serviceQuotes.map(q=>[q.id,q]));
  const trusts=await recomputeTrustBatch(tx,quotes.map(q=>q.issuerPartyId),now);
  const candidates=quotes.flatMap(q=>{try{return [candidateFromQuote(q,lot,input.costs[q.id]||{},providers,trusts.get(q.issuerPartyId),now)];}catch(e){if(e instanceof DecisionError){excluded.push({quoteId:q.id,code:'INVALID_QUOTE_EVIDENCE'});return [];}throw e;}});
  for(const c of candidates){
   for(const key of ['transport','storage'] as const){const item=input.costs[c.id]?.[key];if(item?.amountPaise!==undefined&&item.availabilityConfirmed!==true)c.missing!.push(`costs.${c.id}.${key}.availabilityConfirmed`);}
   if(c.startAt.getTime()>new Date(input.harvestAt!).getTime()+86400000&&!input.costs[c.id]?.storage?.quoteId)c.missing!.push(`costs.${c.id}.storage.quoteId`);
  }
  const scenario:Scenario={quantityGrams:grams,grade:a.qualityGrade,origin:lot.district,harvestAt:new Date(input.harvestAt!),cashDeadline:input.cashDeadline?new Date(input.cashDeadline):null,baselineQuoteId:input.baselineQuoteId,now};
  const comparison=compareCandidates(candidates,scenario);status=comparison.status;
  diagnostics={...diagnostics,excluded:[...excluded,...comparison.diagnostics],missingInputs:[...new Set(comparison.diagnostics.flatMap(d=>d.missing))],baselineQuoteId:comparison.baseline?.candidate.id||null};
  if(!quotes.length){status='NEEDS_INPUT';diagnostics.missingInputs=['buyerQuote'];diagnostics.message='Ask a buyer to publish dated offer terms. Indicative budgets and mandi observations alone cannot support an executable recommendation.';}
  if(comparison.ranked.length&&comparison.ranked[0].netPaise<=0){status='UNAVAILABLE';diagnostics.message='All complete feasible routes have non-positive take-home. No sale is recommended under these assumptions.';}
  if(status==='READY'&&comparison.baseline){
   const baseline=comparison.baseline;
   for(const result of comparison.ranked){
    const c=result.candidate;let wait:any={status:'UNAVAILABLE',reason:'No validated forecast. Future prices, storage loss and weather risk are unknown.'};
    if(input.wait){const storage=providers.get(input.wait.storageQuoteId),end=new Date(now.getTime()+input.wait.horizonDays*86400000);
     if(storage&&providerEligible(storage,lot,grams,now)&&storage.startAt<=now&&storage.endAt>=end&&(!scenario.cashDeadline||end<=scenario.cashDeadline))wait={...hypotheticalWait(input.wait,grams,result.netPaise),storageEvidence:quoteSnapshot(storage)};
     else wait={status:'UNAVAILABLE',reason:'Waiting needs available storage through the horizon and must respect your cash deadline.'};
    }
    const validUntil=new Date(Math.min(now.getTime()+15*60000,c.validUntil.getTime(),...Object.values(c.costSources).filter((v:any)=>v.kind==='PROVIDER_QUOTE').map((v:any)=>new Date(v.snapshot.validUntil).getTime())));
    const snapshot={version:2,quantityGrams:grams.toString(),gradeBasis:'FARMER_DECLARED_ACCEPTED_IN_BUYER_QUOTE',lot:lotSnapshot(lot),lotHash:hash(lotSnapshot(lot)),quote:c.evidence,quoteHash:c.fingerprint,costs:c.costSources,scenario:jsonSafe(scenario),baseline:{quoteId:baseline.candidate.id,name:baseline.candidate.name,netPaise:baseline.netPaise,grossPaise:baseline.grossPaise,costs:baseline.candidate.costs,evidence:baseline.candidate.evidence,fingerprint:baseline.candidate.fingerprint,selectedBy:input.baselineQuoteId?'FARMER':'BEST_FEASIBLE_LOCAL_OR_EARLIEST_SELL_NOW'},knownInputs:['quantity','grade','origin','destination','harvest','paymentDeadline','sixCostCategories','quoteValidity'],missingInputs:[],excludedCandidates:diagnostics.excluded,marketEvidence:'Firm buyer quote; raw mandi averages are contextual, not a guaranteed executable price.',wait:input.wait||null};
    recommendations.push({id:randomUUID(),farmerPartyId:actor.id,buyerPartyId:c.buyerId,listingId:lot.id,runId,quoteId:c.id,scenarioStatus:'READY',formulaVersion:'same-lot-net-v2',evidenceHash:hash(snapshot),sharedFpoId:input.shareWithFpo?actor.fpoId||null:null,
     what:{action:'Sell to',counterpartyName:c.name,quantityKg:safe(grams)/1000,timing:`${c.route}: ${c.destination}; pickup ${c.startAt.toISOString()}, payment due ${c.paymentDueAt.toISOString()}`},
     why:{expectedNetPaise:result.netPaise,baselineNetPaise:baseline.netPaise,deltaPaise:result.deltaPaise,baselineLabel:`${baseline.candidate.name} — feasible sell-now route for the same lot`,grossPaise:result.grossPaise,costs:COST_KEYS.map(k=>({label:k,amountPaise:c.costs[k]})),basis:'Firm recorded buyer quote minus explicitly stated farmer-borne costs. Net sale proceeds, not farm profit. Trust is risk context, never a monetary haircut.'},
     risk:c.trust?.provisional?'HIGH':'MEDIUM',riskBasis:[c.trust?.provisional?'Buyer has limited evidenced payment history.':'High trust does not guarantee payment.','Grade is farmer-declared and accepted in the quote; inspection may still cause a dispute.','Farmer-entered costs are estimates; provider quotes are not reservations until acceptance.'],what_if_wait:wait,expectedNetPaise:BigInt(result.netPaise),baselineNetPaise:BigInt(baseline.netPaise),deltaPaise:BigInt(result.deltaPaise),trustSnapshot:jsonSafe(c.trust||null),inputSnapshot:jsonSafe(snapshot),explanationVersion:'same-lot-explanation-v2',createdAt:now,validUntil});
   }
  }
 }
 const run=await tx.decisionRun.create({data:{id:runId,farmerPartyId:actor.id,listingId:lot.id,requestKey:input.clientRequestId,inputHash,input:jsonSafe(input),status,diagnostics:jsonSafe(diagnostics)}});
 if(recommendations.length)await tx.recommendation.createMany({data:recommendations});
 console.log(JSON.stringify({event:'decision.generated',status,candidates:recommendations.length,durationMs:Date.now()-started}));
 return runView({...run,recommendations});
}
export function runView(run:any){const recommendations=(run.recommendations||[]).sort((a:any,b:any)=>Number(b.expectedNetPaise-a.expectedNetPaise)).map(recommendationView);return {success:true,status:run.status,runId:run.id,diagnostics:run.diagnostics,recommendations,recommendation:recommendations[0]||null};}

export async function revalidateRecommendation(tx:DecisionDb,r:any,allowPooled=false){
 requireDecision(r.formulaVersion&&r.quoteId,409,'This legacy estimate cannot be selected. Generate a current comparison.');
 requireDecision(r.scenarioStatus==='READY'&&r.validUntil>new Date(),409,'Recommendation expired or invalidated. Refresh the comparison.');
 const snapshot=r.inputSnapshot as any;
 const [lot,q]=await Promise.all([tx.listing.findUnique({where:{id:r.listingId},include:{party:{include:{credibility:true}}}}),tx.decisionQuote.findUnique({where:{id:r.quoteId},include:quoteInclude})]);
 requireDecision(lot&&q,409,'The lot or quote no longer exists.');
 requireDecision((lot.status==='OPEN'||allowPooled&&lot.status==='POOLED')&&hash(lotSnapshot(lot))===snapshot.lotHash,409,'Lot terms or inventory changed. Generate a new comparison.');
 requireDecision(quoteHash(q)===snapshot.quoteHash,409,'Buyer terms, verification or demand changed. Generate a new comparison.');
 const providerIds=Object.values(snapshot.costs||{}).filter((v:any)=>v.kind==='PROVIDER_QUOTE').map((v:any)=>v.quoteId);
 const providers=await tx.decisionQuote.findMany({where:{id:{in:providerIds as string[]}},include:quoteInclude});
 for(const source of Object.values(snapshot.costs||{}) as any[]){if(source.kind!=='PROVIDER_QUOTE')continue;const provider=providers.find(p=>p.id===source.quoteId);requireDecision(provider&&quoteHash(provider)===source.fingerprint&&providerEligible(provider,q.listing,q.quantityGrams),409,'A required provider quote or capacity changed. Refresh the comparison.');}
 const candidate=candidateFromQuote(q,allowPooled?{...q.listing,party:lot.party}:lot,{},new Map(),r.trustSnapshot);
 requireDecision(candidate.verified&&!candidate.suspended&&candidate.available&&q.validUntil>new Date(),409,'Buyer or inventory is no longer eligible.');
 requireDecision(!candidate.exclusions?.length&&q.startAt>new Date(),409,'Quote terms or pickup window are no longer valid.');
 return {lot,quote:q,providers};
}

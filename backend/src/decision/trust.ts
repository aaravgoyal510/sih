import {DecisionDb} from './evidence';
import {hash,jsonSafe} from './core';
import {activeOutcomeEvents,attested} from './outcomes';
import {scoreTrust} from '../services/trust-score';
import {randomUUID} from 'node:crypto';

/** Bounded batch, no per-candidate database reads. Enforcement remains legacy. */
export async function recomputeTrustBatch(tx:DecisionDb,ids:string[],now=new Date()){
 const partyIds=[...new Set(ids)].slice(0,30);if(!partyIds.length)return new Map<string,any>();
 const [parties,bookings]=await Promise.all([
  tx.party.findMany({where:{id:{in:partyIds},roles:{has:'BUYER'}},include:{credibility:true,verifications:true}}),
  tx.booking.findMany({where:{offer:{requirement:{partyId:{in:partyIds}}}},include:{offer:{include:{listing:true,requirement:true}},ratings:true,dispute:true,outcomeEvents:{orderBy:{occurredAt:'asc'}}},orderBy:{createdAt:'desc'},take:3000}),
 ]);
 const results=new Map<string,any>(),rows:any[]=[],history:any[]=[];
 for(const party of parties){
  const own=bookings.filter(b=>b.offer.requirement?.partyId===party.id);let eligiblePayments=0,onTimePayments=0,totalTransactions=0,confirmedAtFaultDisputes=0,knownCancellations=0,attributedCancellations=0;const ratingValues:number[]=[];
  for(const b of own){
   const events=activeOutcomeEvents(b.outcomeEvents),real=events.filter(e=>!e.simulation&&attested(e,b.outcomeEvents));
   const dues=real.filter(e=>e.kind==='PAYMENT_DUE'&&e.responsiblePartyId===party.id&&(e.payload as any).payeePartyId===b.offer.listing.partyId&&e.amountPaise&&e.amountPaise>0n&&e.dueAt);
   let evidencedPaid=false;
   for(const due of dues){
    const receipts=real.filter(e=>e.kind==='PAYMENT_RECEIVED'&&e.relatedEventId===due.id).sort((a,b)=>a.occurredAt.getTime()-b.occurredAt.getTime());let paid=0n,paidAt:Date|null=null;
    for(const r of receipts){paid+=r.amountPaise||0n;if(paidAt===null&&paid>=due.amountPaise!)paidAt=r.occurredAt;}
    if(due.dueAt!<=now||paidAt){eligiblePayments++;if(paidAt&&paidAt<=due.dueAt!)onTimePayments++;}
    if(paidAt)evidencedPaid=true;
   }
   if(b.fulfillmentStatus==='COMPLETED'&&evidencedPaid){totalTransactions++;ratingValues.push(...b.ratings.filter(r=>r.giverPartyId===b.offer.listing.partyId&&r.receiverPartyId===party.id).map(r=>r.score));}
   const decisions=events.filter(e=>e.kind==='DISPUTE_OUTCOME'&&!e.simulation&&(e.payload as any).atFaultPartyId===party.id);
   for(const decision of decisions){
    const appeal=events.filter(e=>e.kind==='DISPUTE_APPEAL'&&e.relatedEventId===decision.id).at(-1);
    if((appeal?.payload as any)?.action!=='OVERTURN'){confirmedAtFaultDisputes++;if((decision.payload as any).cancellationFault){attributedCancellations++;knownCancellations++;}}
   }
  }
  const cancelled=own.filter(b=>b.fulfillmentStatus==='CANCELLED').length;
  const evidence={partyId:party.id,role:'BUYER' as const,kycVerified:party.verifications.some(v=>v.role==='BUYER'&&v.documentType==='KYC'&&v.status==='APPROVED'&&(!v.expiresAt||v.expiresAt>now)),totalTransactions,eligibleOrders:totalTransactions+cancelled,onTimePayments,eligiblePayments,attributableCancellations:cancelled===knownCancellations?attributedCancellations:null,cancelledOrdersCount:cancelled,counterpartRating:ratingValues.length?Math.round(ratingValues.reduce((s,v)=>s+v,0)/ratingValues.length*10)/10:null,ratingCount:ratingValues.length,disputesCount:own.filter(b=>b.dispute).length,confirmedAtFaultDisputes,suspended:party.credibility?.suspended||false};
  const computed=scoreTrust(evidence);
  const trust={...computed,asOf:now.toISOString(),formulaVersion:'buyer-evidence-v2-shadow',shadowMode:true,enforcementSource:'LEGACY_CREDIBILITY',evidenceNotes:['Only counterpart-attested, non-simulated payment obligations and receipts contribute to payment reliability.','Completed history and ratings require evidenced settlement. Missing cancellation attribution remains unknown.','Bounded history: latest 3,000 bookings across at most 30 buyers in this batch. High trust is not guaranteed payment.'],legacyComparison:{score:party.credibility?.score??null,suspended:party.credibility?.suspended||false,disputeCount:party.credibility?.disputeCount??null}};
  const evidenceHash=hash({...evidence,bookingIds:own.map(b=>b.id),eventIds:own.flatMap(b=>b.outcomeEvents.map(e=>e.id)),formulaVersion:trust.formulaVersion});
  const {attributableCancellations,...columns}=evidence;
  const stored={...columns,score:trust.score,tier:trust.tier as 'HIGH_TRUST'|'MEDIUM_TRUST'|'LOW_TRUST',onTimePaymentPct:trust.onTimePaymentPct,onTimeFulfillmentPct:null,provisional:trust.provisional,suspended:trust.suspended,formulaVersion:trust.formulaVersion,evidenceSnapshot:jsonSafe(trust),asOf:now};
  rows.push({id:randomUUID(),...stored,updatedAt:now});history.push({partyId:party.id,evidenceHash,snapshot:jsonSafe(trust),legacySnapshot:jsonSafe(trust.legacyComparison),formulaVersion:trust.formulaVersion});results.set(party.id,trust);
 }
 if(rows.length){
  // Fixed identifier/type registry; all values remain a single bound JSON parameter.
  const registry={id:'text',partyId:'text',role:'text',score:'integer',tier:'text',kycVerified:'boolean',totalTransactions:'integer',eligibleOrders:'integer',onTimePayments:'integer',eligiblePayments:'integer',onTimePaymentPct:'double precision',onTimeFulfillmentPct:'double precision',disputesCount:'integer',confirmedAtFaultDisputes:'integer',cancelledOrdersCount:'integer',counterpartRating:'double precision',ratingCount:'integer',provisional:'boolean',suspended:'boolean',formulaVersion:'text',evidenceSnapshot:'jsonb',asOf:'timestamp',updatedAt:'timestamp'};
  const names=Object.keys(registry),column=(n:string)=>`"${n}"`;
  const select=names.map(n=>n==='role'?`${column(n)}::"TrustRole"`:n==='tier'?`${column(n)}::"TrustTier"`:column(n)).join(',');
  await tx.$executeRawUnsafe(`INSERT INTO "TrustScore" (${names.map(column).join(',')}) SELECT ${select} FROM jsonb_to_recordset($1::jsonb) AS x(${Object.entries(registry).map(([n,t])=>`${column(n)} ${t}`).join(',')}) ON CONFLICT ("partyId","role") DO UPDATE SET ${names.filter(n=>!['id','partyId','role'].includes(n)).map(n=>`${column(n)}=EXCLUDED.${column(n)}`).join(',')}`,JSON.stringify(jsonSafe(rows)));
  await tx.trustHistory.createMany({data:history,skipDuplicates:true});
 }
 return results;
}

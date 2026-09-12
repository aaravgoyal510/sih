import {z} from 'zod';
import {DecisionDb} from './evidence';
import {COST_KEYS,hash,jsonSafe,requireDecision,safe} from './core';
export const OUTCOME_COSTS={transport:'TRANSPORT_COST',storage:'STORAGE_COST',handling:'HANDLING_COST',commission:'COMMISSION_COST',spoilage:'SPOILAGE_COST',financing:'FINANCING_COST'} as const;
export const outcomeInput=z.object({
 kind:z.enum(['PAYMENT_DUE','PAYMENT_RECEIVED','TRANSPORT_COST','STORAGE_COST','HANDLING_COST','COMMISSION_COST','SPOILAGE_COST','FINANCING_COST','COSTS_COMPLETE','CONFIRM','REVERSE']),
 amountPaise:z.number().int().min(0).max(1e14).optional(),occurredAt:z.string().datetime(),dueAt:z.string().datetime().optional(),
 evidenceRef:z.string().trim().min(5).max(500),simulation:z.boolean(),idempotencyKey:z.string().uuid(),relatedEventId:z.string().uuid().optional(),payeePartyId:z.string().uuid().optional(),
});
export async function bookingContext(tx:DecisionDb,bookingId:string){
 const b=await tx.booking.findUnique({where:{id:bookingId},include:{offer:{include:{listing:true,requirement:true}},decisionSelections:{include:{recommendation:true}},outcomeEvents:{orderBy:[{occurredAt:'asc'},{createdAt:'asc'}]}}});
 requireDecision(b,404,'Booking not found.');return b;
}
export function bookingAudience(b:any,actorId:string){return [b.offer.listing.partyId,b.offer.requirement?.partyId,...b.decisionSelections.map((s:any)=>s.recommendation.farmerPartyId)].includes(actorId);}
export function activeOutcomeEvents(events:any[]){
 const reversed=new Set(events.filter(e=>e.kind==='REVERSE'&&(e.simulation||events.some(c=>c.kind==='CONFIRM'&&c.relatedEventId===e.id&&!c.simulation&&c.actorId!==e.actorId))).map(e=>e.relatedEventId));
 return events.filter(e=>!reversed.has(e.id)&&!['REVERSE','CONFIRM'].includes(e.kind));
}
export function attested(event:any,events:any[]){return !event.simulation&&events.some(c=>c.kind==='CONFIRM'&&c.relatedEventId===event.id&&!c.simulation&&c.actorId!==event.actorId);}
export function summarizeOutcomes(events:any[],payeeId:string,expectedNetPaise:number|null,completed:boolean){
 const active=activeOutcomeEvents(events).filter(e=>e.payload?.payeePartyId===payeeId);
 function amounts(simulation:boolean){
  const eligible=active.filter(e=>e.simulation===simulation&&(simulation||attested(e,events)));
  const receipts:bigint=eligible.filter(e=>e.kind==='PAYMENT_RECEIVED').reduce((s,e)=>s+BigInt(e.amountPaise||0),0n);
  const costEvents=eligible.filter(e=>Object.values(OUTCOME_COSTS).includes(e.kind));
  const costs:bigint=costEvents.reduce((s,e)=>s+BigInt(e.amountPaise||0),0n);
  const missing=COST_KEYS.filter(k=>!costEvents.some(e=>e.kind===OUTCOME_COSTS[k]));
  const complete=completed&&receipts>0n&&missing.length===0&&eligible.some(e=>e.kind==='COSTS_COMPLETE');
  const net=complete?safe(receipts-costs):null;
  return {status:complete?(simulation?'SIMULATED':'EVIDENCED'):'NEEDS_EVIDENCE',receiptsPaise:safe(receipts),costsPaise:safe(costs),netPaise:net,deltaVsExpectedPaise:net!==null&&expectedNetPaise!==null?safe(BigInt(net)-BigInt(expectedNetPaise)):null,missingCostCategories:missing,costCompletenessAttested:eligible.some(e=>e.kind==='COSTS_COMPLETE')};
 }
 return {expected:{status:'ESTIMATED',netPaise:expectedNetPaise},realized:amounts(false),simulation:amounts(true),evidenceBasis:'EVIDENCED means transaction participants attested recorded receipts and costs. It is not independent bank verification. Simulations never count as farmer income.'};
}
export async function recordOutcome(tx:DecisionDb,bookingId:string,actorId:string,raw:unknown){
 const input=outcomeInput.parse(raw),b=await bookingContext(tx,bookingId);requireDecision(bookingAudience(b,actorId),403,'Booking evidence access denied.');
 const existing=await tx.bookingOutcomeEvent.findUnique({where:{bookingId_actorId_idempotencyKey:{bookingId,actorId,idempotencyKey:input.idempotencyKey}}});
 if(existing){requireDecision((existing.payload as any).inputHash===hash(input),409,'This evidence request already has different content.');return existing;}
 const seller=b.offer.listing.partyId,buyer=b.offer.requirement!.partyId;
 const payee=input.payeePartyId||seller,member=payee!==seller;
 requireDecision(payee===seller||b.decisionSelections.some(s=>s.recommendation.farmerPartyId===payee),403,'This payee has no selected recommendation in the booking.');
 const payer=member?seller:buyer;
 requireDecision([payee,payer].includes(actorId),403,'Only the receipt/cost parties can attest this evidence.');
 const occurredAt=new Date(input.occurredAt);requireDecision(occurredAt.getTime()<=Date.now()+60000&&occurredAt>=b.createdAt,400,'Evidence timestamp must fall within the recorded transaction history.');
 const related=input.relatedEventId?b.outcomeEvents.find(e=>e.id===input.relatedEventId):null;
 const financial=input.kind==='PAYMENT_DUE'||input.kind==='PAYMENT_RECEIVED'||Object.values(OUTCOME_COSTS).includes(input.kind as any);
 if(financial)requireDecision(input.amountPaise!==undefined&&(input.kind!=='PAYMENT_RECEIVED'||input.amountPaise>0),400,'Give a nonnegative amount; receipts must be positive.');
 if(input.kind==='PAYMENT_DUE')requireDecision(actorId===payer&&input.dueAt&&new Date(input.dueAt)>=occurredAt,403,'The paying party must record an explicit due time.');
 if(input.kind==='PAYMENT_RECEIVED')requireDecision(actorId===payee&&related?.kind==='PAYMENT_DUE'&&(related.payload as any).payeePartyId===payee&&related.simulation===input.simulation,403,'The recipient must link a receipt to its payment obligation.');
 if(Object.values(OUTCOME_COSTS).includes(input.kind as any)||input.kind==='COSTS_COMPLETE')requireDecision(actorId===payee,403,'Only the recipient can declare their sale costs.');
 if(['CONFIRM','REVERSE'].includes(input.kind)){
  requireDecision(related&&related.simulation===input.simulation&&(related.payload as any).payeePartyId===payee,400,'Choose existing evidence for the same payee and simulation mode.');
  requireDecision(related.kind!=='CONFIRM',400,'Confirmation records cannot be edited or reversed. Reverse the underlying evidence instead.');
  if(input.kind==='CONFIRM')requireDecision(related.actorId!==actorId&&!b.outcomeEvents.some(e=>e.kind==='CONFIRM'&&e.relatedEventId===related.id&&e.actorId===actorId),409,'Only the other party can confirm evidence, once.');
  if(input.kind==='REVERSE')requireDecision(related.actorId===actorId&&related.kind!=='REVERSE'&&!b.outcomeEvents.some(e=>e.kind==='REVERSE'&&e.relatedEventId===related.id),409,'Only the evidence author can request one reversal.');
 }
 const created=await tx.bookingOutcomeEvent.create({data:{bookingId,kind:input.kind,actorId,responsiblePartyId:input.kind.startsWith('PAYMENT')?payer:payee,amountPaise:input.amountPaise===undefined?null:BigInt(input.amountPaise),occurredAt,dueAt:input.dueAt?new Date(input.dueAt):null,evidenceRef:input.evidenceRef,simulation:input.simulation,evidenceLevel:input.simulation?'SIMULATED':input.kind==='CONFIRM'?'COUNTERPARTY_ATTESTED':'SELF_REPORTED',idempotencyKey:input.idempotencyKey,relatedEventId:input.relatedEventId,payload:{payeePartyId:payee,payerPartyId:payer,inputHash:hash(input)}}});
 await tx.decisionJob.createMany({data:[{eventKey:`outcome:${created.id}:trust`,kind:'TRUST',targetId:buyer},{eventKey:`outcome:${created.id}:aggregate`,kind:'OUTCOME',targetId:bookingId}],skipDuplicates:true});
 return created;
}
export async function operationalOutcome(tx:DecisionDb,booking:any,actorId:string,kind:string){
 const mapped=({ACCEPT:'AGREEMENT_ACCEPTED',COMPLETE:'FULFILLED',CANCEL:'CANCELLED',RELEASE:'PAYMENT_RECEIVED'} as Record<string,string>)[kind];if(!mapped)return;
 const seller=booking.offer.listing.partyId,buyer=booking.offer.requirement?.partyId;if(!buyer)return;
 const amount=kind==='RELEASE'?BigInt((booking.agreementSnapshot as any)?.totalAmountPaise??Math.round((booking.totalAmount||0)*100)):null;
 await tx.bookingOutcomeEvent.createMany({data:[{bookingId:booking.id,actorId,kind:mapped,responsiblePartyId:buyer,amountPaise:amount,occurredAt:new Date(),evidenceRef:'Platform simulation; no funds moved',simulation:true,evidenceLevel:'SIMULATED',idempotencyKey:`transition:${kind}`,payload:{payeePartyId:seller,payerPartyId:buyer}}],skipDuplicates:true});
 await tx.decisionJob.createMany({data:[{eventKey:`booking:${booking.id}:${kind}:trust`,kind:'TRUST',targetId:buyer}],skipDuplicates:true});
}

import {DecisionDb} from './evidence';
import {revalidateRecommendation} from './service';
import {requireDecision} from './core';
export async function decisionsForAcceptance(tx:DecisionDb,offer:any,recommendationId?:string){
 const quote=await tx.decisionQuote.findUnique({where:{offerId:offer.id}});
 if(!quote){requireDecision(!recommendationId,409,'This offer does not match the chosen recommendation.');return {records:[] as any[],providers:[] as any[],quote:null};}
 const plan=await tx.poolPlan.findUnique({where:{listingId:offer.listingId},include:{consents:{include:{recommendation:{include:{selection:true}}}}}});
 let records:any[]=[];
 if(plan){requireDecision(plan.status==='EXECUTED'&&plan.consents.length===(plan.members as any[]).length,409,'Every pool member must consent before execution.');records=plan.consents.map(c=>c.recommendation);}
 else{requireDecision(recommendationId,409,'Choose a current take-home recommendation before accepting this quoted offer.');const r=await tx.recommendation.findUnique({where:{id:recommendationId},include:{selection:true}});requireDecision(r,409,'Chosen recommendation not found.');records=[r];}
 const providers=new Map<string,any>();
 for(const r of records){requireDecision(r.quoteId===quote.id&&r.selection&&!r.selection.bookingId&&(plan?plan.consents.some(c=>c.recommendationId===r.id):r.farmerPartyId===offer.listing.partyId),409,'This quote has no matching unexecuted farmer choice.');const checked=await revalidateRecommendation(tx,r,!!plan);for(const p of checked.providers)providers.set(p.id,p);}
 return {records,providers:[...providers.values()],quote};
}
export async function linkDecisions(tx:DecisionDb,booking:any,decision:Awaited<ReturnType<typeof decisionsForAcceptance>>){
 for(const r of decision.records){
  await tx.decisionSelection.update({where:{recommendationId:r.id},data:{bookingId:booking.id,linkedAt:new Date()}});
  await tx.bookingOutcomeEvent.create({data:{bookingId:booking.id,kind:'RECOMMENDATION_SELECTED',actorId:r.farmerPartyId,responsiblePartyId:r.farmerPartyId,occurredAt:r.selection.selectedAt,evidenceRef:`Chosen immutable decision ${r.id}`,simulation:true,evidenceLevel:'SIMULATED',idempotencyKey:`selected:${r.id}`,payload:{recommendationId:r.id,evidenceHash:r.evidenceHash,payeePartyId:r.farmerPartyId}}});
 }
 for(const provider of decision.providers){const reserved=await tx.listing.updateMany({where:{id:provider.serviceListingId!,status:'OPEN'},data:{status:'BOOKED'}});requireDecision(reserved.count===1,409,'Provider capacity was booked by another transaction. Refresh the decision.');await tx.decisionReservation.create({data:{quoteId:provider.id,bookingId:booking.id}});}
 if(decision.quote?.paymentDueAt){const listing=await tx.listing.findUnique({where:{id:decision.quote.listingId},select:{partyId:true}});await tx.bookingOutcomeEvent.create({data:{bookingId:booking.id,kind:'PAYMENT_DUE',actorId:decision.quote.issuerPartyId,responsiblePartyId:decision.quote.issuerPartyId,amountPaise:BigInt(booking.agreementSnapshot.totalAmountPaise),occurredAt:new Date(),dueAt:decision.quote.paymentDueAt,evidenceRef:`Quote ${decision.quote.id}; simulated settlement`,simulation:true,evidenceLevel:'SIMULATED',idempotencyKey:'quoted-payment-due',payload:{payeePartyId:listing!.partyId,payerPartyId:decision.quote.issuerPartyId}}});}
}
export async function releaseDecisionCapacity(tx:DecisionDb,bookingId:string){
 const reservations=await tx.decisionReservation.findMany({where:{bookingId,releasedAt:null},include:{quote:true}});
 for(const r of reservations){await tx.listing.updateMany({where:{id:r.quote.serviceListingId!,status:'BOOKED'},data:{status:'OPEN'}});await tx.decisionReservation.update({where:{id:r.id},data:{releasedAt:new Date()}});}
}

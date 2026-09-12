import {z} from 'zod';
import {DecisionDb,currentVerification,lotSnapshot,providerEligible,quoteInclude} from './evidence';
import {decimalUnits,hash,jsonSafe,quantityGrams,requireDecision,safe} from './core';
const quoteInput=z.object({
 clientRequestId:z.string().uuid(),kind:z.enum(['SALE','TRANSPORT','STORAGE']),listingId:z.string().uuid(),offerId:z.string().uuid().optional(),requirementId:z.string().uuid().optional(),serviceListingId:z.string().uuid().optional(),
 quantity:z.object({value:z.union([z.number(),z.string()]),unit:z.enum(['kg','quintal','tonne'])}),unitPricePaise:z.number().int().min(0).max(1e12),priceBasis:z.enum(['PER_KG','TOTAL','PER_KG_DAY']),route:z.enum(['BUYER','MARKET','FPO','TRANSPORT','STORAGE']),
 destination:z.string().trim().min(2).max(100),startAt:z.string().datetime(),endAt:z.string().datetime(),paymentDueAt:z.string().datetime().optional(),validUntil:z.string().datetime(),grade:z.enum(['A','B','C']),jurisdictionConfirmed:z.literal(true),reference:z.string().trim().min(5).max(300),
});
export async function createQuote(tx:DecisionDb,actor:any,raw:unknown){
 const input=quoteInput.parse(raw),now=new Date(),digest=hash({actor:actor.id,request:input.clientRequestId}),id=`${digest.slice(0,8)}-${digest.slice(8,12)}-4${digest.slice(13,16)}-a${digest.slice(17,20)}-${digest.slice(20,32)}`;
 const previous=await tx.decisionQuote.findUnique({where:{id},include:quoteInclude});if(previous){requireDecision((previous.evidence as any).inputHash===hash(input),409,'This quote request already contains different terms.');return previous;}
 const lot=await tx.listing.findUnique({where:{id:input.listingId},include:{party:{include:{credibility:true}},poolPlan:true}});requireDecision(lot&&lot.resourceType==='CROP_LOT'&&['OPEN','DRAFT'].includes(lot.status)&&!lot.party.credibility?.suspended,409,'The crop lot is not available for a quote.');
 requireDecision(lot.status!=='DRAFT'||lot.poolPlan?.status==='DRAFT',409,'This draft is not an active pool proposal.');
 const grams=quantityGrams(input.quantity.value,input.quantity.unit),a=lot.attributes as any;
 requireDecision(grams<=quantityGrams(a.quantityKg)&&(!a.isPooled||grams===quantityGrams(a.quantityKg)),400,'Quote a feasible crop quantity; pooled lots must be quoted in full.');
 requireDecision(input.grade===a.qualityGrade,400,'The quoted grade must match the declared crop grade.');
 const startAt=new Date(input.startAt),endAt=new Date(input.endAt),validUntil=new Date(input.validUntil);
 requireDecision(validUntil>now&&validUntil.getTime()<=now.getTime()+30*86400000&&startAt>now&&endAt>=startAt&&endAt.getTime()<=now.getTime()+90*86400000,400,'Give a future pickup/storage window and a quote expiry within 30 days.');
 requireDecision(!actor.credibility?.suspended,403,'Suspended accounts cannot issue quotes.');
 let offerId=input.offerId,service:any=null;
 if(input.kind==='SALE'){
  requireDecision(actor.roles.includes('BUYER')&&currentVerification(actor,'BUYER',now)&&lot.partyId!==actor.id,403,'A buyer with current approved KYC must issue the sale quote.');
  requireDecision(input.priceBasis==='PER_KG'&&input.unitPricePaise>0&&['BUYER','MARKET','FPO'].includes(input.route)&&input.paymentDueAt,400,'A sale quote needs paise/kg, route and payment due time.');
  requireDecision(new Date(input.paymentDueAt)>=endAt,400,'Payment due time must not precede delivery.');
  requireDecision((input.route==='FPO')===!!a.isPooled,400,'Only a pooled crop lot uses the FPO sale route.');
  if(offerId){
   const offer=await tx.offer.findUnique({where:{id:offerId},include:{requirement:true,decisionQuote:true}});
   requireDecision(offer&&offer.requirement&&offer.listingId===lot.id&&offer.requirement.partyId===actor.id&&['PENDING','COUNTERED'].includes(offer.status)&&!offer.decisionQuote,409,'Choose your current unquoted offer, or create a new offer for changed terms.');
   requireDecision(decimalUnits(offer.price,2)===BigInt(input.unitPricePaise)&&quantityGrams(offer.requirement.quantityNeeded!)===grams,400,'Quote price and quantity must equal the recorded offer.');
   requireDecision((offer.requirement.district||actor.district).toLowerCase()===input.destination.toLowerCase(),400,'Destination must match the buyer requirement district.');
  }else{
   let requirementId=input.requirementId;
   if(requirementId){const r=await tx.requirement.findUnique({where:{id:requirementId},include:{offers:{where:{status:'ACCEPTED'}}}});requireDecision(r&&r.partyId===actor.id&&r.resourceType==='CROP_LOT'&&!r.offers.length&&(!r.deadline||r.deadline>now)&&quantityGrams(r.quantityNeeded!)===grams,409,'The buyer requirement is not feasible.');requireDecision((r.district||actor.district).toLowerCase()===input.destination.toLowerCase(),400,'Destination must match the buyer requirement district.');}
   else{const r=await tx.requirement.create({data:{partyId:actor.id,resourceType:'CROP_LOT',district:input.destination,quantityNeeded:safe(grams)/1000,budget:input.unitPricePaise/100,deadline:validUntil,attributes:{crop:a.crop,qualityGrade:a.qualityGrade,quantityKg:safe(grams)/1000}}});requirementId=r.id;}
   const offer=await tx.offer.create({data:{listingId:lot.id,requirementId,price:input.unitPricePaise/100,status:'PENDING'}});offerId=offer.id;
  }
 }else{
  const role=input.kind==='TRANSPORT'?'TRANSPORT_OPERATOR':'STORAGE_OPERATOR';
  requireDecision(actor.roles.includes(role)&&currentVerification(actor,role,now)&&input.serviceListingId&&!offerId&&input.route===input.kind,403,'Only the verified provider can issue this service quote.');
  requireDecision(input.priceBasis==='TOTAL'||input.kind==='STORAGE'&&input.priceBasis==='PER_KG_DAY',400,'Use a total transport/storage price or paise/kg/day for storage.');
  service=await tx.listing.findUnique({where:{id:input.serviceListingId},include:{party:{include:{credibility:true,verifications:true}}}});requireDecision(service?.partyId===actor.id,403,'Quote only your own provider capacity.');
  requireDecision(providerEligible({kind:input.kind,status:'ACTIVE',validUntil,quantityGrams:grams,serviceListing:service,startAt,endAt,origin:lot.district,destination:input.destination},lot,grams,now),409,'Provider verification, capacity, route or availability does not cover this quote.');
 }
 const quote=await tx.decisionQuote.create({data:{id,kind:input.kind,issuerPartyId:actor.id,listingId:lot.id,serviceListingId:service?.id,offerId,quantityGrams:grams,unitPricePaise:BigInt(input.unitPricePaise),priceBasis:input.priceBasis,route:input.route,origin:lot.district,destination:input.destination,startAt,endAt,paymentDueAt:input.paymentDueAt?new Date(input.paymentDueAt):null,validUntil,evidence:{grade:input.grade,gradeBasis:'FARMER_DECLARED_ACCEPTED_BY_ISSUER',jurisdictionConfirmed:true,reference:input.reference,inputHash:hash(input),lotHash:hash(lotSnapshot(lot)),moneyUnit:'INR_PAISE',simulation:!!a.demoScenario}},include:quoteInclude});
 await tx.notification.createMany({data:[{partyId:lot.partyId,eventKey:`quote:${quote.id}`,kind:'DECISION',payload:{quoteId:quote.id,listingId:lot.id,event:'QUOTE_RECEIVED'}}],skipDuplicates:true});return quote;
}

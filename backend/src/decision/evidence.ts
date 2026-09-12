import {Prisma} from '@prisma/client';
import {Candidate,COST_KEYS,CostEvidence,decimalUnits,hash,quantityGrams,requireDecision,rounded,safe} from './core';
export type DecisionDb=Prisma.TransactionClient;
export const quoteInclude={issuer:{include:{credibility:true,verifications:true}},listing:{include:{party:{include:{credibility:true}}}},serviceListing:{include:{party:{include:{credibility:true,verifications:true}}}},offer:{include:{requirement:{include:{offers:{where:{status:'ACCEPTED' as const},select:{id:true}}}}}}} as const;
export function currentVerification(p:any,role:string,now=new Date()) {return p.verifications?.some((v:any)=>v.role===role&&v.status==='APPROVED'&&(!v.expiresAt||v.expiresAt>now)&&(role!=='BUYER'||v.documentType==='KYC'))||false;}
export function lotSnapshot(l:any){return {id:l.id,partyId:l.partyId,district:l.district,attributes:l.attributes,price:l.price,priceUnit:l.priceUnit,availableFrom:l.availableFrom,availableTo:l.availableTo};}
export function quoteSnapshot(q:any){
 const r=q.offer?.requirement;
 return {id:q.id,kind:q.kind,issuerPartyId:q.issuerPartyId,listingId:q.listingId,serviceListingId:q.serviceListingId,offerId:q.offerId,quantityGrams:q.quantityGrams.toString(),unitPricePaise:q.unitPricePaise.toString(),priceBasis:q.priceBasis,route:q.route,origin:q.origin,destination:q.destination,startAt:q.startAt,endAt:q.endAt,paymentDueAt:q.paymentDueAt,validUntil:q.validUntil,status:q.status,evidence:q.evidence,createdAt:q.createdAt,
  offer:q.offer?{id:q.offer.id,price:q.offer.price,status:q.offer.status}:null,
  requirement:r?{id:r.id,partyId:r.partyId,quantityNeeded:r.quantityNeeded,attributes:r.attributes,deadline:r.deadline,acceptedOffers:r.offers}:null,
  issuer:{id:q.issuer.id,suspended:q.issuer.credibility?.suspended||false,verifications:q.issuer.verifications.map((v:any)=>({id:v.id,role:v.role,documentType:v.documentType,status:v.status,expiresAt:v.expiresAt}))},
  service:q.serviceListing?{...lotSnapshot(q.serviceListing),status:q.serviceListing.status,suspended:q.serviceListing.party.credibility?.suspended||false}:null};
}
export const quoteHash=(q:any)=>hash(quoteSnapshot(q));
export function providerEligible(q:any,lot:any,grams:bigint,now=new Date()){
 const l=q.serviceListing,role=q.kind==='TRANSPORT'?'TRANSPORT_OPERATOR':'STORAGE_OPERATOR';
 if(!l||q.status!=='ACTIVE'||q.validUntil<=now||q.quantityGrams!==grams||l.status!=='OPEN'||l.party.credibility?.suspended||!currentVerification(l.party,role,now))return false;
 if(l.availableFrom&&l.availableFrom>q.startAt||l.availableTo&&l.availableTo<q.endAt)return false;
 const a=l.attributes as any;
 if(q.kind==='TRANSPORT')return l.resourceType==='TRANSPORT'&&quantityGrams(a.capacityKg)>=grams&&a.route?.from?.toLowerCase()===q.origin.toLowerCase()&&a.route?.to?.toLowerCase()===q.destination.toLowerCase();
 return l.resourceType==='COLD_STORAGE'&&quantityGrams(a.capacityQuintal,'quintal')>=grams&&a.cropSuitability?.some((s:string)=>s.trim().toLowerCase()===String(lot.attributes.crop).trim().toLowerCase())&&l.district.toLowerCase()===lot.district.toLowerCase();
}
export function providerCost(q:any){
 if(q.priceBasis==='TOTAL')return safe(q.unitPricePaise);
 requireDecision(q.kind==='STORAGE'&&q.priceBasis==='PER_KG_DAY',400,'Unsupported provider quote units.');
 const days=Math.max(1,Math.ceil((q.endAt.getTime()-q.startAt.getTime())/86400000));
 return safe(rounded(BigInt(q.quantityGrams)*BigInt(q.unitPricePaise)*BigInt(days),1000n));
}
export function candidateFromQuote(q:any,lot:any,costInput:Partial<Record<typeof COST_KEYS[number],CostEvidence>>,providers:Map<string,any>,trust:any,now=new Date()):Candidate{
 const costs:Candidate['costs']={},costSources:Record<string,unknown>={},missing:string[]=[],exclusions:string[]=[];let providerAvailable=true;
 for(const key of COST_KEYS){const input=costInput[key];if(!input)continue;
  if(input.quoteId){const provider=providers.get(input.quoteId);
   if(!provider||!['transport','storage'].includes(key)||provider.kind!==key.toUpperCase()||provider.listingId!==lot.id||!providerEligible(provider,lot,q.quantityGrams,now)||provider.origin.toLowerCase()!==q.origin.toLowerCase()||(key==='transport'&&provider.destination.toLowerCase()!==q.destination.toLowerCase())||provider.startAt>q.startAt||provider.endAt<q.endAt){providerAvailable=false;continue;}
   costs[key]=providerCost(provider);costSources[key]={kind:'PROVIDER_QUOTE',quoteId:provider.id,fingerprint:quoteHash(provider),snapshot:quoteSnapshot(provider)};
  }else if(input.amountPaise!==undefined){costs[key]=input.amountPaise;costSources[key]={kind:'FARMER_ESTIMATE',amountPaise:input.amountPaise,basis:input.basis};}
 }
 const r=q.offer?.requirement,a=lot.attributes as any;
 if(!q.offer||!r)missing.push('buyerOffer');
 if(q.status!=='ACTIVE')exclusions.push('QUOTE_REVOKED');
 if(r?.deadline&&r.deadline<=now)exclusions.push('BUYER_REQUIREMENT_EXPIRED');
 if(r&&quantityGrams(r.quantityNeeded)!==q.quantityGrams)exclusions.push('BUYER_QUANTITY_CHANGED');
 if(q.offer&&decimalUnits(q.offer.price,2)!==q.unitPricePaise)exclusions.push('OFFER_PRICE_CHANGED');
 if(r&&(String(r.attributes.crop).trim().toLowerCase()!==String(a.crop).trim().toLowerCase()||r.attributes.qualityGrade&&r.attributes.qualityGrade!==a.qualityGrade))exclusions.push('BUYER_GRADE_OR_CROP_CHANGED');
 if(!q.paymentDueAt)missing.push('paymentDueAt');
 if(q.evidence.jurisdictionConfirmed!==true)missing.push('jurisdictionConfirmation');
 if(lot.availableTo&&lot.availableTo<q.endAt||lot.availableFrom&&lot.availableFrom>q.startAt)exclusions.push('LOT_AVAILABILITY_WINDOW');
 return {id:q.id,buyerId:q.issuerPartyId,name:q.issuer.name,route:q.route,quantityGrams:q.quantityGrams,unitPricePaise:q.unitPricePaise,origin:q.origin,destination:q.destination,startAt:q.startAt,endAt:q.endAt,paymentDueAt:q.paymentDueAt||q.endAt,validUntil:q.validUntil,
  verified:q.issuer.roles.includes('BUYER')&&currentVerification(q.issuer,'BUYER',now),suspended:!!q.issuer.credibility?.suspended,
  available:['OPEN','DRAFT'].includes(lot.status)&&!lot.party?.credibility?.suspended&&['PENDING','COUNTERED'].includes(q.offer?.status)&&!r?.offers?.length,
  grade:q.evidence.grade||'',providerAvailable,costs,costSources,trust,fingerprint:quoteHash(q),evidence:quoteSnapshot(q),missing,exclusions};
}

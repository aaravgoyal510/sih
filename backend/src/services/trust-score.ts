/** Evidence-based v1 score; absence is never turned into an observed percentage. */
export type TrustEvidence={partyId:string;role:'BUYER'|'FARMER';kycVerified:boolean;totalTransactions:number;eligibleOrders:number;onTimePayments:number;eligiblePayments:number;attributableCancellations:number|null;cancelledOrdersCount:number;counterpartRating:number|null;ratingCount:number;disputesCount:number;confirmedAtFaultDisputes:number;suspended:boolean};
export function scoreTrust(e:TrustEvidence){
 const payment=e.eligiblePayments>0?e.onTimePayments/e.eligiblePayments:null;
 const cancellation=e.eligibleOrders>0&&e.attributableCancellations!==null?1-e.attributableCancellations/e.eligibleOrders:null;
 const provisional=e.totalTransactions<10||payment===null||cancellation===null||e.counterpartRating===null;
 const raw=Math.round((e.kycVerified?20:0)+40*(payment??0)+10*Math.min(e.totalTransactions/40,1)+10*(cancellation??0)+20*(e.counterpartRating??0)/5)-10*e.confirmedAtFaultDisputes;
 const suspended=e.suspended||e.confirmedAtFaultDisputes>=3;
 const score=Math.max(0,Math.min(suspended?49:provisional?59:100,raw));
 return {...e,score,tier:score>=80?'HIGH_TRUST':score>=50?'MEDIUM_TRUST':'LOW_TRUST',onTimePaymentPct:payment===null?null:Math.round(payment*1000)/10,onTimeFulfillmentPct:null,provisional,suspended,asOf:new Date().toISOString(),formulaVersion:'buyer-evidence-v1',evidenceNotes:['Current booking payments are simulated, not verified bank receipts.','Payment due/settlement times and cancellation attribution are not recorded in legacy bookings. Missing components contribute no earned points; this is not proof of misconduct.']};
}

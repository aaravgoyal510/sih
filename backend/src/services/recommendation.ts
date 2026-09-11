import {randomUUID} from 'node:crypto';
export type RecommendationInput={buyerName:string;quantityKg:number;budgetPerKg:number;transportPaise:number;otherCostsPaise:number;baselineNetPaise?:number;now?:Date;source?:'OFFER'|'BUDGET'};
export function makeRecommendation(input:RecommendationInput){
 const grossPaise=Math.round(input.budgetPerKg*input.quantityKg*100);
 const expectedNetPaise=grossPaise-input.transportPaise-input.otherCostsPaise;
 const deltaPaise=input.baselineNetPaise===undefined?null:expectedNetPaise-input.baselineNetPaise;
 if(![grossPaise,expectedNetPaise,deltaPaise??0,input.transportPaise,input.otherCostsPaise,input.baselineNetPaise??0].every(Number.isSafeInteger)||input.quantityKg<=0||input.budgetPerKg<=0||input.transportPaise<0||input.otherCostsPaise<0)throw new Error('Invalid decision amounts or quantities.');
 const now=input.now||new Date(),isOffer=input.source==='OFFER';
 return {id:randomUUID(),synthetic:false,persisted:false,createdAt:now.toISOString(),validUntil:new Date(now.getTime()+15*60000).toISOString(),explanationVersion:isOffer?'offer-net-v1':'budget-net-v1',
  what:{action:expectedNetPaise<0?'Do not sell under these cost assumptions':'Discuss a sale with',counterpartyName:input.buyerName,quantityKg:input.quantityKg,timing:'Confirm the final price, pickup and payment terms first.'},
  why:{expectedNetPaise,baselineNetPaise:input.baselineNetPaise??null,deltaPaise:input.baselineNetPaise===undefined?null:expectedNetPaise-input.baselineNetPaise,baselineLabel:'Your entered local alternative for the same quantity.',grossPaise,costs:[{label:'Transport',amountPaise:input.transportPaise},{label:'Other sale costs',amountPaise:input.otherCostsPaise}],basis:isOffer?'Current recorded offer price and user-entered costs. Terms must be accepted; payment is simulated.':'Buyer-published budget, self-declared quality and user-entered costs. Not a binding buyer quote.'},
  risk:{level:'High',basis:[isOffer?'Offer price is recorded; grade, pickup and payment terms still need confirmation.':'Buyer budget is indicative; grade, pickup and payment terms need confirmation.','Costs not entered and crop losses can reduce the final amount.']},
  what_if_wait:{status:'UNAVAILABLE',reason:'No validated waiting forecast. Storage cost and crop loss may reduce returns.'},buyerTrust:null};
}

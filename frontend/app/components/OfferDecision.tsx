'use client';
import React,{useState} from 'react';
import {useLanguage} from '../../lib/LanguageContext';
import {copy} from '../../lib/assist-copy';
import DecisionPreview from './DecisionPreview';

export default function OfferDecision({offer}:{offer:any}){
 const {language}=useLanguage(),c=(s:string)=>copy(language,s);
 const [cost,setCost]=useState({transport:'',other:''});
 if(!offer.requirement||offer.listing.resourceType!=='CROP_LOT'||!['PENDING','COUNTERED'].includes(offer.status))return null;
 return <section className="ks-panel" style={{marginTop:18}} aria-label={c('Compare this offer before accepting')}>
  <h3>{c('Compare this offer before accepting')}</h3>
  <p className="ks-note">{c('The calculation uses the recorded offer price, not the buyer budget.')}</p>
  <div className="ks-form">
   <label>{c('Transport cost for this buyer')} (₹)<input type="number" min="0" step="0.01" value={cost.transport} onChange={e=>setCost(v=>({...v,transport:e.target.value}))}/></label>
   <label>{c('Other sale costs')} (₹)<input type="number" min="0" step="0.01" value={cost.other} onChange={e=>setCost(v=>({...v,other:e.target.value}))}/></label>
  </div>
  <DecisionPreview listingId={offer.listingId||offer.listing.id} offerId={offer.id} option={{id:offer.requirementId||offer.requirement.id,quantityKg:offer.requirement.quantityNeeded,budgetPerKg:offer.price,buyer:offer.requirement.party}} cost={cost}/>
 </section>;
}

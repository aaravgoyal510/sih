'use client';
import React,{useRef,useState} from 'react';
import {ArrowRight,Search,CheckCircle2} from 'lucide-react';
import {request,resourceTitle,money,resourceLabels} from '../../lib/workspace';
import {useLanguage} from '../../lib/LanguageContext';
import {copy} from '../../lib/assist-copy';

export default function DemandPanel({data,onSaved}:{data:any;onSaved:()=>Promise<void>}){
 const {language}=useLanguage(),c=(s:string)=>copy(language,s);
 const [selected,setSelected]=useState<any>(null),[matches,setMatches]=useState<any[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const sequence=useRef(0),lock=useRef(false),keys=useRef<Record<string,string>>({});
 async function match(requirement:any){
  const ticket=++sequence.current;setSelected(requirement);setMatches([]);setError('');setBusy(true);
  try{const result=await request('/matches/'+requirement.id);if(sequence.current===ticket)setMatches(result.matches);}
  catch{if(sequence.current===ticket)setError('Check the status before trying again.');}
  finally{if(sequence.current===ticket)setBusy(false);}
 }
 async function offer(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(lock.current||!selected)return;lock.current=true;setBusy(true);setError('');
  const form=new FormData(event.currentTarget),listingId=String(form.get('listingId')),key=selected.id+':'+listingId;
  try{
   await request('/offers','POST',{clientRequestId:keys.current[key] ||= crypto.randomUUID(),listingId,requirementId:selected.id,quantity:selected.quantityNeeded,price:Number(form.get('price'))});
   delete keys.current[key];setNotice('Offer sent. Open Offers & bookings to track the response.');setSelected(null);
   // Success is already confirmed; refreshing the board is not part of the write.
   void onSaved().catch(()=>{});
  }catch{setError('Check the status before trying again.');}finally{lock.current=false;setBusy(false);}
 }
 const available=data.requirements.filter((r:any)=>!r._count?.offers&&(!r.deadline||Date.parse(r.deadline)>Date.now()));
 const eligible=selected?.partyId===data.party.id?matches:matches.filter(m=>data.listings.some((l:any)=>l.id===m.listingId&&l.partyId===data.party.id));
 return <section className="ks-panel" style={{marginBottom:24}}>
  <div className="ks-section-heading"><div><p className="ks-eyebrow">{c('DEMAND BOARD')}</p><h2>{c('Connect supply with demand')}</h2></div><Search size={23}/></div>
  {error&&<p role="alert" className="ks-alert error">{c(error)}</p>}
  {notice&&<p role="status" className="ks-alert"><CheckCircle2 size={16}/>{c(notice)}</p>}
  {available.length?available.slice(0,12).map((r:any)=><div className="ks-row" key={r.id}>
   <div className="ks-grow"><strong>{c(resourceTitle(r))} · {c(resourceLabels[r.resourceType])}</strong><small>{r.party.name} · {r.district} · {r.quantityNeeded} {c(r.resourceType==='CROP_LOT'?'kg':'units')} · {c('Budget')}: {money(r.budget)}/{c(r.resourceType==='CROP_LOT'?'kg':'unit')}</small></div>
   <button disabled={busy} className="ks-button secondary" onClick={()=>match(r)}>{c('Find matches')}<ArrowRight size={14}/></button>
  </div>):<p className="ks-subtitle">{c('No open demand yet. Buyers can publish requirements from their workspace.')}</p>}
  {selected&&<section className="ks-note" aria-label={c('Matching supply')}>
   <h3>{c('Matches for')} {c(resourceTitle(selected))}</h3>
   <p>{c('Feasibility is checked before ranking. Fit score is not a take-home income estimate.')}</p>
   {busy&&!matches.length?<p>{c('Loading…')}</p>:matches.length?matches.slice(0,5).map(m=><div className="ks-row" key={m.listingId}><div className="ks-grow"><strong>{m.title}</strong><small>{m.partyName} · {m.district} · {money(m.price)}</small></div><b>{Math.round(m.score)}% {c('fit')}</b></div>):<p>{c('No compatible open listings were found.')}</p>}
   {eligible.length>0&&<form className="ks-form" onSubmit={offer}>
    <label>{c(selected.partyId===data.party.id?'Choose matching supply':'Your compatible listing')}<select name="listingId" required defaultValue=""><option value="" disabled>{c('Choose a listing')}</option>{eligible.map(m=><option key={m.listingId} value={m.listingId}>{m.title} · {m.partyName} · {money(m.price)}</option>)}</select></label>
    <label>{c('Offer price per unit')} (₹)<input name="price" type="number" min="0.01" step="0.01" required defaultValue={selected.budget||undefined}/></label>
    <p>{c('Quantity')}: {selected.quantityNeeded} {c(selected.resourceType==='CROP_LOT'?'kg':'units')}. {c('Review the quantity and price before sending. Nothing is booked automatically.')}</p>
    <button disabled={busy} className="ks-button">{c(busy?'Saving…':'Respond with an offer')}</button>
   </form>}
   {!busy&&!eligible.length&&selected.partyId!==data.party.id&&<p>{c('You do not have a compatible open listing for this demand.')}</p>}
  </section>}
 </section>;
}

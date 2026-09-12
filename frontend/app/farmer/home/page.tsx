'use client';
import React,{useEffect,useState} from 'react';
import Link from 'next/link';
import {Sprout,TrendingUp,LayoutGrid,Receipt,MapPin,ArrowUpRight,Mic} from 'lucide-react';
import {useLanguage} from '../../../lib/LanguageContext';
import {copy} from '../../../lib/assist-copy';
import {request,money} from '../../../lib/workspace';
import {ReadAloud} from '../../components/VoiceControls';
export default function FarmerHome(){
 const {t,language}=useLanguage(),c=(s:string)=>copy(language,s);
 const [party,setParty]=useState<any>(null),[error,setError]=useState('');
 useEffect(()=>{try{setParty(JSON.parse(localStorage.getItem('maha_party')||'null'));}catch{}request('/farmer-home').then(d=>{setParty(d.party);setError('');}).catch(()=>setError('Please sign in again.'));},[]);
 const crops=party?.listings||[],pending=crops.reduce((n:number,l:any)=>n+l.offers.length,0);
 return <div><div className="ks-farmer-welcome"><div><h1>{t('namaste')}, {party?.name||c('Supplier')}</h1><p><MapPin size={15}/>{party?.district||'Maharashtra'}</p></div><Sprout size={50}/></div>
 {error&&<div className="ks-alert error">{c(error)}<Link href="/demo">{c('Sign in to continue')}</Link></div>}
 <div className="ks-actions" style={{marginBottom:22}}><Link className="ks-button secondary" href="/farmer/decisions">{c('Saved decisions')}</Link><Link className="ks-button secondary" href="/farmer/account">{c('Verification update')}</Link></div>
 <div className="ks-section-heading"><div><p className="ks-eyebrow">{c('Your next step')}</p><h2>{c('My crop')}</h2></div><ReadAloud text={t('namaste')+'. '+c('Sell my crop')+'. '+c('Compare prices')+'. '+c('Offers & payments')}/></div>
 <div className="farmer-grid">{[[Sprout,'sell','sellMyCropTitle','sellMyCropDesc'],[TrendingUp,'prices','checkPricesTitle','checkPricesDesc'],[LayoutGrid,'services','getHelpTitle','getHelpDesc'],[Receipt,'offers','myOffersTitle','myOffersDesc']].map(([Icon,route,title,desc]:any)=><Link key={route} href={`/farmer/${route}`} className="action-button"><div className={`action-icon-wrapper ${route}`}><Icon size={30}/></div><span className="action-title">{t(title)}</span><span className="action-subtitle">{t(desc)}</span><ArrowUpRight size={17} style={{marginTop:12,color:'#6d8577'}}/></Link>)}</div>
 <Link href="/farmer/sell" className="ks-button full" style={{margin:'22px 0',minHeight:56,fontSize:17}}><Mic size={23}/>{c('Speak to fill')} — {c('Sell my crop')}</Link>
 <section className="ks-panel"><div className="ks-section-heading"><h2>{c('My crop')}</h2><Link href="/farmer/offers">{c('Open offers')}: {pending}</Link></div>{crops.length?crops.map((lot:any)=><Link key={lot.id} href={`/farmer/buyers?listingId=${lot.id}`} className="ks-task-row"><span><strong>{c(lot.attributes.crop)}</strong><small>{Number(lot.attributes.quantityKg).toLocaleString('en-IN')} {c('kg')} · {money(lot.price)}/{c('kg')}</small></span><span>{c('Open offers')}: {lot.offers.length}<ArrowUpRight size={17}/></span></Link>):<p className="ks-note">{c('Publish a crop so buyers can make an offer.')}</p>}</section>
 </div>;
}

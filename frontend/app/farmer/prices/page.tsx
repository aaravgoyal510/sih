'use client';
import React,{useEffect,useState} from 'react';
import Link from 'next/link';
import {TrendingUp,MapPin,RefreshCw,WifiOff} from 'lucide-react';
import {API_URL} from '../../../lib/api-config';
import {money} from '../../../lib/workspace';
import {useLanguage} from '../../../lib/LanguageContext';

let pendingPrices: Promise<any> | null = null;
function getPrices(refresh = false) {
 if (!pendingPrices) pendingPrices = fetch(`${API_URL}/api/mandi-prices?limit=2500${refresh ? '&refresh=1' : ''}`, { cache: 'no-store', signal: AbortSignal.timeout(75000) })
  .then(async response => { const data = await response.json(); if (!response.ok || !data.success) throw new Error('Could not load prices'); return data; })
  .finally(() => { pendingPrices = null; });
 return pendingPrices;
}

export default function Prices(){
 const {t}=useLanguage();const [feed,setFeed]=useState<any>(null);const [prices,setPrices]=useState<any[]>([]),[offline,setOffline]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[crop,setCrop]=useState('Onion'),[district,setDistrict]=useState('Nashik'),[quantity,setQuantity]=useState(500),[transport,setTransport]=useState(1000),[commission,setCommission]=useState(0);
 async function load(refresh=false){
  setLoading(true);
  const saved=()=>{try{return JSON.parse(localStorage.getItem('ks_verified_market_prices_v1')||'[]');}catch{return [];}};
  try{
   const d=await getPrices(refresh);const records=d.prices.length?d.prices:saved();
   const cachedOnly=!d.prices.length&&records.length>0;
   setFeed({...d,...(cachedOnly?{mode:Date.now()-Date.parse(records[0].recordedAt)>72*3600000?'stale':'cached',lastObservedAt:records[0].recordedAt}:{})});
   setPrices(records);setOffline(false);
   if(d.prices.length)localStorage.setItem('ks_verified_market_prices_v1',JSON.stringify(d.prices));
   setError('');
  }catch{
   setPrices(saved());setOffline(true);setFeed((previous:any)=>previous?{...previous,mode:'cached',warning:'Connection unavailable; showing saved observations.'}:null);
   setError('Connection unavailable. Only previously saved prices are shown.');
  }finally{setLoading(false);}
 }
 useEffect(()=>{load();const timer=setInterval(()=>{if(document.visibilityState==='visible')load();},5*60000);const online=()=>load(true);window.addEventListener('online',online);return()=>{clearInterval(timer);window.removeEventListener('online',online);};},[]);
 const crops=Array.from(new Set(prices.map(p=>p.crop))).sort();
 const history=prices.filter(p=>p.crop===crop);const latest=new Map<string,any>();for(const p of history)if(!latest.has(p.district+'|'+p.market))latest.set(p.district+'|'+p.market,p);
 const markets=Array.from(latest.values()).sort((a,b)=>b.pricePerKg-a.pricePerKg);
 const points=history.filter(p=>p.district===district).sort((a,b)=>new Date(a.recordedAt).getTime()-new Date(b.recordedAt).getTime());
 const daily=new Map<string,number[]>();for(const p of points){const day=p.recordedAt.slice(0,10);daily.set(day,[...(daily.get(day)||[]),p.pricePerKg]);}const series=Array.from(daily.entries()).map(([day,values])=>({day,value:values.reduce((s,n)=>s+n,0)/values.length})).slice(-14);
 const lo=Math.min(...series.map(p=>p.value))*0.95,hi=Math.max(...series.map(p=>p.value))*1.05;const change=series.length>1?(series[series.length-1].value-series[0].value)/series[0].value*100:null;
 return <div><Link className="ks-back" href="/farmer/home">← {t('backToHome')}</Link><header className="ks-page-heading"><div><p className="ks-eyebrow">PRICE DISCOVERY</p><h1>{t('mandiPricesTitle')}</h1><p className="ks-subtitle">Compare market prices and estimate what reaches your pocket.</p></div><button className="ks-button secondary" onClick={()=>load(true)} disabled={loading}><RefreshCw size={16}/>Refresh</button></header>{feed&&<section className="ks-panel" style={{marginBottom:20}} aria-live="polite"><div className="ks-section-heading"><h2>{({live:'Latest government feed',cached:'Saved verified feed',stale:'Older market observations',unavailable:'Live feed unavailable'} as Record<string,string>)[feed.mode]}</h2><span className="ks-badge">{feed.source}</span></div><p className="ks-subtitle">Market reports update when mandis publish them—not tick-by-tick prices. Auto-check every 5 minutes; manual refresh is limited to once per minute.</p><p>Last fetched: {feed.lastFetchedAt?new Date(feed.lastFetchedAt).toLocaleString():'No successful fetch this session'} · Latest observation: {feed.lastObservedAt?new Date(feed.lastObservedAt).toLocaleDateString():'Not available'}</p>{feed.warning&&<p className="ks-note" role="status">{feed.warning}</p>}<small>{feed.priceBasis}. Demo seed prices are excluded.</small></section>}{offline&&<div className="ks-alert"><WifiOff size={18}/>{error||'Showing cached records.'}</div>}<div className="ks-toolbar"><select aria-label="Crop" value={crop} onChange={e=>setCrop(e.target.value)}>{(crops.length?crops:['Onion']).map(c=><option key={c}>{c}</option>)}</select><select aria-label="District" value={district} onChange={e=>setDistrict(e.target.value)}>{Array.from(new Set(['Nashik',...prices.map(p=>p.district)])).sort().map(d=><option key={d}>{d}</option>)}</select><span className="ks-muted">Source labels and dates are retained from saved feed records.</span></div><div className="ks-two-column"><section className="ks-panel"><div className="ks-section-heading"><h2>{crop} in {district}</h2><TrendingUp size={23}/></div>{series.length>1?<><svg viewBox="0 0 600 180" role="img" aria-label={`${crop} price history in ${district}`} style={{width:'100%',height:180}}><line x1="20" y1="150" x2="580" y2="150" stroke="#dce5d9"/><polyline fill="none" stroke="#3c8855" strokeWidth="3" points={series.map((p,i)=>`${20+i*560/(series.length-1)},${150-(p.value-lo)/(hi-lo)*125}`).join(' ')}/>{series.map((p,i)=><circle key={p.day} cx={20+i*560/(series.length-1)} cy={150-(p.value-lo)/(hi-lo)*125} r="4" fill="#3c8855"><title>{p.day}: {money(p.value)}/kg</title></circle>)}</svg><div className="ks-section-heading"><small>{series[0].day}</small><small>{series[series.length-1].day}</small></div><p className="ks-note">Observed change: {change!>=0?'+':''}{change!.toFixed(1)}%. {change!>3?'Prices have risen in the available history. Compare possible gains with storage and spoilage costs before waiting.':'Compare current net returns across markets before selling.'} This is a history-based signal, not a price forecast.</p></>:<div className="ks-empty"><TrendingUp size={28}/><h3>{series.length?money(series[0].value)+'/kg':'No observations yet'}</h3><p>At least two recorded dates are needed to show a trend. No forecast is generated from a single observation.</p></div>}</section><aside className="ks-panel"><h2>Net value calculator</h2><p className="ks-subtitle">Use your actual costs to compare returns.</p><div className="ks-form"><label>Quantity (kg)<input type="number" min="1" value={quantity} onChange={e=>setQuantity(Math.max(1,Number(e.target.value)))}/></label><label>Total transport cost (₹)<input type="number" min="0" value={transport} onChange={e=>setTransport(Math.max(0,Number(e.target.value)))}/></label><label>Commission (%)<input type="number" min="0" max="100" value={commission} onChange={e=>setCommission(Math.min(100,Math.max(0,Number(e.target.value))))}/></label></div></aside></div><section className="ks-panel" style={{marginTop:22}}><h2>Compare nearby market returns</h2><p className="ks-subtitle">Net estimate = price × quantity − transport − commission. Same entered costs applied to each market; adjust costs for your route.</p>{loading?<div className="ks-loading">Loading saved market observations…</div>:markets.length?markets.map(p=><div className="ks-row" key={p.id}><MapPin size={22}/><div className="ks-grow"><strong>{p.market}</strong><small>{p.district} · {p.source} · Observed {new Date(p.recordedAt).toLocaleDateString()}</small></div><div className="ks-right"><strong>{money(p.pricePerKg)}/kg</strong><small>Estimated net {money(p.pricePerKg*quantity*(1-commission/100)-transport)}</small></div></div>):<div className="ks-empty">No saved prices for this crop. Try another crop or refresh after the next feed sync.</div>}</section></div>;
}

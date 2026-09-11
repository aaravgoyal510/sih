'use client';
import React,{useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ShieldCheck,MessageSquare,RefreshCw} from 'lucide-react';
import {useLanguage} from '../../lib/LanguageContext';
import {copy} from '../../lib/assist-copy';
import {request,label,ApiError} from '../../lib/workspace';
import {ReadAloud} from './VoiceControls';

export default function FarmerAccount(){
 const {language}=useLanguage(),c=(s:string)=>copy(language,s);
 const [tab,setTab]=useState<'verification'|'disputes'>('verification'),[data,setData]=useState<any>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const sequence=useRef(0),lock=useRef(false);
 async function load(){const ticket=++sequence.current;setLoading(true);setError('');try{const d=await request(`/snapshot?section=${tab}`);if(ticket===sequence.current)setData(d);}catch(e){if(ticket===sequence.current)setError(e instanceof ApiError&&e.status===401?'Please sign in again.':'Check the status before trying again.');}finally{if(ticket===sequence.current)setLoading(false);}}
 useEffect(()=>{setData(null);void load();return()=>{sequence.current++;};},[tab]);
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');const form=event.currentTarget,f=new FormData(form);try{
  const result=await request('/verification','POST',{role:'FARMER',documentType:'LAND_RECORD',documentRef:String(f.get('documentRef')).trim(),...(f.get('documentUrl')?{documentUrl:String(f.get('documentUrl')).trim()}:{})});
  setData((d:any)=>({...d,verifications:[{...result.verification,party:d.party,auditLogs:result.verification.auditLogs||[]},...d.verifications]}));setNotice('Document submitted for review. This is not automatic government verification.');form.reset();
 }catch(e){setError(e instanceof ApiError&&e.status===401?'Please sign in again.':'Check the status before trying again.');}finally{setBusy(false);lock.current=false;}}
 const date=(value:string)=>new Date(value).toLocaleString(language==='hi'?'hi-IN':language==='mr'?'mr-IN':'en-IN');
 if(data&&!data.party.roles.includes('FARMER'))return <section className="ks-panel"><p>{c('This page is for farmers. Choose your own portal.')}</p><Link href="/demo">{c('Switch portal')}</Link></section>;
 return <div className="ks-assisted" style={{maxWidth:850}}>
  <Link href="/farmer/home" className="ks-back"><ArrowLeft size={18}/>{c('Go home')}</Link>
  <header className="ks-page-heading"><h1>{c('My documents & help')}</h1><button className="ks-button secondary" disabled={loading||busy} onClick={load}><RefreshCw size={18}/>{c('Refresh')}</button></header>
  <div className="ks-actions" role="group" aria-label={c('My documents & help')}>
   <button className={`ks-button ${tab==='verification'?'':'secondary'}`} disabled={busy} aria-pressed={tab==='verification'} onClick={()=>setTab('verification')}><ShieldCheck size={20}/>{c('My documents')}</button>
   <button className={`ks-button ${tab==='disputes'?'':'secondary'}`} disabled={busy} aria-pressed={tab==='disputes'} onClick={()=>setTab('disputes')}><MessageSquare size={20}/>{c('My complaints')}</button>
  </div>
  {error&&<p className="ks-alert error" role="alert">{c(error)}{error==='Please sign in again.'&&<Link href="/login">{c('Sign in')}</Link>}</p>}
  {notice&&<p className="ks-alert" role="status">{c(notice)}</p>}
  {loading&&!data?<p className="ks-loading">{c('Loading…')}</p>:data&&tab==='verification'?<>
   <section className="ks-panel" style={{marginTop:20}}><h2>{c('Submit your land record')}</h2>
    <p className="ks-note">{c('Enter the reference shown on your land record. Your district reviewer checks it. Do not share your password or bank details.')}</p>
    <ReadAloud text={c('Enter the reference shown on your land record. Your district reviewer checks it. Do not share your password or bank details.')}/>
    <form className="ks-form" onSubmit={submit}>
     <label>{c('Land record reference')}<input name="documentRef" minLength={3} maxLength={200} required autoComplete="off"/></label>
     <label>{c('Document link (optional)')}<input name="documentUrl" type="url" placeholder="https://…"/></label>
     <button className="ks-button" disabled={busy}>{c(busy?'Saving…':'Send for review')}</button>
    </form>
   </section>
   <section className="ks-panel" style={{marginTop:20}}><h2>{c('Your submitted documents')}</h2>
    {!data.verifications.length?<p>{c('No documents submitted yet.')}</p>:data.verifications.map((v:any)=><article className="ks-update" key={v.id}><div className="ks-section-heading"><strong>{v.documentRef}</strong><span className={`ks-badge ${v.status==='APPROVED'?'good':''}`}>{c(label(v.status))}</span></div>
     {v.slaDeadline&&<p>{c('Review due')}: {date(v.slaDeadline)}</p>}
     {v.documentUrl&&<a href={v.documentUrl} target="_blank" rel="noreferrer">{c('Open submitted document')}</a>}
     <ReadAloud text={`${c('Status')}: ${c(label(v.status))}. ${v.auditLogs?.map((a:any)=>a.note).join('. ')||''}`}/>
     <details><summary>{c('Recorded activity')}</summary>{v.auditLogs?.map((a:any)=><p key={a.id}>{c(label(a.toStatus))} · {date(a.createdAt)}<br/>{a.note}</p>)}</details>
    </article>)}
   </section>
  </>:data&&<section className="ks-panel" style={{marginTop:20}}><h2>{c('My complaints')}</h2><p className="ks-note">{c('To report a problem, open the relevant agreement in Offers & payments. Your district handles the complaint.')}</p><Link href="/farmer/offers" className="ks-button">{c('Offers & payments')}</Link>
   {!data.disputes.length?<p>{c('No complaints recorded.')}</p>:data.disputes.map((d:any)=><article key={d.id} className="ks-update"><span className="ks-badge">{c(label(d.status))}</span><p>{d.reason}</p>{d.resolutionNote&&<p className="ks-note">{d.resolutionNote}</p>}
    <ReadAloud text={`${c('Status')}: ${c(label(d.status))}. ${d.reason}. ${d.resolutionNote||''}`}/>
    <details><summary>{c('Recorded activity')}</summary>{d.auditLogs?.map((a:any)=><p key={a.id}>{c(label(a.toStatus))} · {date(a.createdAt)}<br/>{a.note}</p>)}</details>
   </article>)}
  </section>}
 </div>;
}

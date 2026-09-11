'use client';
import {useRef,useState} from 'react';
import {API_URL} from '../../lib/api-config';
import {request,ApiError,label} from '../../lib/workspace';
import {useLanguage} from '../../lib/LanguageContext';
import {copy} from '../../lib/assist-copy';

async function privateRequest(path:string,options:RequestInit={}) {
 const token=localStorage.getItem('maha_token');
 const response=await fetch(`${API_URL}/api/workspace${path}`,{...options,cache:'no-store',signal:AbortSignal.timeout(90000),headers:{...options.headers,...(token?{Authorization:`Bearer ${token}`}:{})}});
 if(!response.ok){const data=await response.json().catch(()=>null);throw new ApiError(data?.error||'Check the status before trying again.',response.status);}
 return response;
}

export function VerificationDocument({verification}:{verification:any}) {
 const {language}=useLanguage(),c=(s:string)=>copy(language,s),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!verification.documentUrl)return null;
 if(!verification.documentUrl.startsWith('storage://'))return /^https?:\/\//.test(verification.documentUrl)?<a href={verification.documentUrl} target="_blank" rel="noreferrer">{c('Open submitted document')}</a>:null;
 async function download(){setBusy(true);setError('');try{
  const response=await privateRequest(`/verification/${verification.id}/document`),blob=await response.blob(),url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=`document-${verification.id}.${blob.type==='application/pdf'?'pdf':blob.type==='image/png'?'png':'jpg'}`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }catch{setError('Document could not be downloaded. Please sign in and try again.');}finally{setBusy(false);}}
 return <div><button type="button" className="ks-button secondary" disabled={busy} onClick={download}>{c(busy?'Loading…':'Download private document')}</button>{error&&<p role="alert" className="ks-alert error">{c(error)}</p>}</div>;
}

export function VerificationForm({role,documents,onSubmitted}:{role:string;documents:string[];onSubmitted:(verification:any)=>void}){
 const {language}=useLanguage(),c=(s:string)=>copy(language,s),[busy,setBusy]=useState(false),[error,setError]=useState(''),[hasFile,setHasFile]=useState(false);
 const lock=useRef(false),requestKey=useRef('');
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');
  const form=event.currentTarget,f=new FormData(form),file=f.get('documentFile') as File|null;
  try{
   const data={role,documentType:String(f.get('documentType')),documentRef:String(f.get('documentRef')).trim()};let result;
   if(file?.size){
    if(file.size>2*1024*1024||!['image/png','image/jpeg','application/pdf'].includes(file.type))throw new Error('Choose a PNG, JPEG or PDF document up to 2 MB.');
    requestKey.current||=crypto.randomUUID();
    const response=await privateRequest('/verification-upload',{method:'POST',headers:{'Content-Type':file.type,'x-verification-role':role,'x-document-type':data.documentType,'x-document-ref':encodeURIComponent(data.documentRef),'x-request-id':requestKey.current},body:file});result=await response.json();
   }else result=await request('/verification','POST',{...data,...(f.get('documentUrl')?{documentUrl:String(f.get('documentUrl')).trim()}:{})});
   onSubmitted(result.verification);form.reset();setHasFile(false);requestKey.current='';
  }catch(e){setError(e instanceof Error?e.message:'Check the status before trying again.');}finally{lock.current=false;setBusy(false);}
 }
 return <form className="ks-form" onSubmit={submit} onChange={()=>{if(!busy)requestKey.current='';}}>
  {error&&<p className="ks-alert error" role="alert">{c(error)}</p>}
  <fieldset disabled={busy} style={{border:0,padding:0,margin:0,display:'grid',gap:16,minWidth:0}}>
   <label>{c('Document type')}<select name="documentType" required>{documents.map(d=><option key={d} value={d}>{c(label(d))}</option>)}</select></label>
   <label>{c(role==='FARMER'?'Land record reference':'Registration / document reference')}<input name="documentRef" minLength={3} maxLength={200} required autoComplete="off"/></label>
   <label>{c('Upload document (optional)')}<input name="documentFile" type="file" accept="image/png,image/jpeg,application/pdf" onChange={e=>setHasFile(Boolean(e.target.files?.[0]))}/></label>
   <p className="ks-note">{c('PNG, JPEG or PDF, up to 2 MB. Private uploads are accessible only to you and authorized reviewers. Files are not virus-scanned; upload documents you trust.')}</p>
   {!hasFile&&<label>{c('Document link (optional)')}<input name="documentUrl" type="url" placeholder="https://…"/></label>}
   <button className="ks-button" disabled={busy}>{c(busy?'Saving…':'Send for review')}</button>
  </fieldset>
 </form>;
}

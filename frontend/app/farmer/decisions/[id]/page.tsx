'use client';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import {request} from '../../../../lib/workspace';
import RecommendationCard from '../../../components/decision/RecommendationCard';
import {copy} from '../../../../lib/assist-copy';
import {useLanguage} from '../../../../lib/LanguageContext';
export default function SavedDecision(){const {id}=useParams<{id:string}>(),{language}=useLanguage(),c=(s:string)=>copy(language,s),[record,setRecord]=useState<any>(null),[error,setError]=useState(false);useEffect(()=>{request(`/recommendations/${id}`).then(d=>setRecord(d.recommendation)).catch(()=>setError(true));},[id]);return <section className="ks-assisted"><Link href="/farmer/decisions">{c('Saved decisions')}</Link><h1>{c('Saved decision')}</h1><p className="ks-note">{c('Recorded estimates are not completed sales. Recheck expired or changed terms.')}</p>{error?<p role="alert">{c('Please sign in again.')}</p>:record?<RecommendationCard recommendation={record}/>:<p>{c('Loading…')}</p>}</section>;}

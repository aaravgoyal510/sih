'use client';
import React,{useState} from 'react';
import Link from 'next/link';
import {Warehouse,Truck,Tractor,Users,Package,ArrowLeft} from 'lucide-react';
import {useLanguage} from '../../lib/LanguageContext';
import {copy} from '../../lib/assist-copy';
import {ReadAloud} from './VoiceControls';
import ServiceMarket from './ServiceMarket';
export default function ServiceChooser(){
 const {language}=useLanguage(),c=(s:string)=>copy(language,s);const [selected,setSelected]=useState('');
 const services=[['COLD_STORAGE','Storage','Protect your crop until sale',Warehouse],['TRANSPORT','Transport','Move your crop to the buyer',Truck],['EQUIPMENT_SERVICE','Equipment','Hire a machine for farm work',Tractor],['LABOR','Labor','Find a crew for farm work',Users],['INPUT_GROUP_BUY','Inputs','Find seeds and farm inputs',Package],['FPO','FPO aggregation','Combine harvests to reach larger buyers',Users]];
 if(selected==='FPO')return <div className="ks-assisted ks-panel"><h1>{c('Your producer organization')}</h1><p>{c('Combine harvests to reach larger buyers')}</p><Link className="ks-button" href="/farmer/organization">{c('Continue')}</Link><button className="ks-button secondary" onClick={()=>setSelected('')}>{c('Choose a service')}</button></div>;
 if(selected)return <><button className="ks-button secondary" onClick={()=>setSelected('')}><ArrowLeft size={18}/>{c('Choose a service')}</button><ServiceMarket type={selected}/></>;
 return <div className="ks-assisted"><Link className="ks-back" href="/farmer/home">← {c('Go home')}</Link><div className="ks-section-heading"><h1>{c('Choose a service')}</h1><ReadAloud text={c('Choose a service')+'. '+services.map(s=>c(String(s[1]))).join('. ')}/></div><div className="ks-service-grid">{services.map(([type,title,description,Icon]:any)=><button key={type} className="ks-service-tile" onClick={()=>setSelected(type)}><Icon size={34}/><h2>{c(title)}</h2><p>{c(description)}</p></button>)}</div></div>;
}

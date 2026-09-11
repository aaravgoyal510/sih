'use client';
import Link from 'next/link';
import {useLanguage} from '../lib/LanguageContext';
import {copy} from '../lib/assist-copy';
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){
 const {language}=useLanguage(),c=(s:string)=>copy(language,s);
 return <section className="ks-assisted ks-panel" role="alert"><h1>{c('This page could not load')}</h1><p>{c('Check the latest status before repeating a payment or offer.')}</p><div className="ks-actions"><button className="ks-button" onClick={reset}>{c('Try again')}</button><Link className="ks-button secondary" href="/demo">{c('Switch portal')}</Link></div></section>;
}

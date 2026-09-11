'use client';
import Link from 'next/link';
import {useLanguage} from '../lib/LanguageContext';
import {copy} from '../lib/assist-copy';
export default function NotFound(){const {language}=useLanguage(),c=(s:string)=>copy(language,s);return <section className="ks-assisted ks-panel"><h1>{c('Page not found')}</h1><p>{c('This link may be old. Open your portal to continue.')}</p><Link href="/demo" className="ks-button">{c('Switch portal')}</Link></section>;}

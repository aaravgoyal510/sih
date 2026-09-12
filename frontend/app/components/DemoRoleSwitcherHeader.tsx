'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Leaf, ArrowUpRight, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { LanguageTogglePill, useLanguage } from '../../lib/LanguageContext';
import { copy } from '../../lib/assist-copy';
import UpdatesBell from './UpdatesBell';
import { roleLabels } from '../../lib/workspace';

export default function DemoRoleSwitcherHeader() {
  const [party,setParty] = useState<any>(null);
  const {language}=useLanguage(), c=(s:string)=>copy(language,s);
  const router=useRouter(),path=usePathname();
  useEffect(()=>{try{setParty(JSON.parse(localStorage.getItem('maha_party')||'null'));}catch{setParty(null);}},[path]);
  return <header className="ks-global-header"><Link href="/demo" className="ks-brand"><span><Leaf size={24}/></span><div>KrishiSetu<small>FARMER NET REALIZATION</small></div></Link><div className="ks-header-actions"><LanguageTogglePill/><UpdatesBell party={party}/>{party&&<span className="ks-account"><b>{party.name}</b><small>{roleLabels[party.roles[0]]}</small></span>}<Link href="/demo" className="ks-switch">{c('Switch portal')} <ArrowUpRight size={15}/></Link>{!party&&<Link href="/login" className="ks-switch">{c('Sign in')}</Link>}{party&&<button className="ks-icon-button" aria-label={c('Sign out')} onClick={()=>{localStorage.removeItem('maha_token');localStorage.removeItem('maha_party');localStorage.removeItem('maha_demo_role');setParty(null);router.push('/login');}}><LogOut size={18}/></button>}</div></header>;
}

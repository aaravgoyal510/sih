'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Leaf, ArrowUpRight, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { LanguageTogglePill } from '../../lib/LanguageContext';
import { roleLabels } from '../../lib/workspace';

export default function DemoRoleSwitcherHeader() {
  const [party,setParty] = useState<any>(null);
  const router=useRouter(),path=usePathname();
  useEffect(()=>{try{setParty(JSON.parse(localStorage.getItem('maha_party')||'null'));}catch{setParty(null);}},[path]);
  return <header className="ks-global-header"><Link href="/demo" className="ks-brand"><span><Leaf size={24}/></span><div>KrishiSetu<small>FROM FARM TO OPPORTUNITY</small></div></Link><div className="ks-header-actions">{path.startsWith('/farmer')&&<LanguageTogglePill/>}{party&&<span className="ks-account"><b>{party.name}</b><small>{roleLabels[party.roles[0]]}</small></span>}<Link href="/demo" className="ks-switch">Switch portal <ArrowUpRight size={15}/></Link>{party&&<button className="ks-icon-button" aria-label="Sign out" onClick={()=>{localStorage.removeItem('maha_token');localStorage.removeItem('maha_party');localStorage.removeItem('maha_demo_role');setParty(null);router.push('/login');}}><LogOut size={18}/></button>}</div></header>;
}

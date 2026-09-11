'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Home,Sprout,TrendingUp,Receipt} from 'lucide-react';
import {useLanguage} from '../../lib/LanguageContext';
import {copy} from '../../lib/assist-copy';
export default function FarmerNavigation(){const path=usePathname(),{language}=useLanguage();if(!path.startsWith('/farmer'))return null;return <nav className="ks-bottom-nav" aria-label="Farmer navigation">{[['home','Go home',Home],['sell','Sell my crop',Sprout],['prices','Compare prices',TrendingUp],['offers','Offers & payments',Receipt]].map(([route,name,Icon]:any)=><Link key={route} href={`/farmer/${route}`} aria-current={path===`/farmer/${route}`?'page':undefined}><Icon size={21}/>{copy(language,name)}</Link>)}</nav>;}

'use client';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import BuyerTrust from '../../components/BuyerTrust';
import {useLanguage} from '../../../lib/LanguageContext';
import {copy} from '../../../lib/assist-copy';
export default function BuyerProfile(){const {id}=useParams<{id:string}>(),{language}=useLanguage();return <section className="ks-assisted ks-panel"><Link href="/farmer/home">{copy(language,'Go home')}</Link><h1>{copy(language,'Buyer Trust Score')}</h1><BuyerTrust partyId={id} autoLoad/></section>;}

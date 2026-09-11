import {Suspense} from 'react';
import BuyerOptions from '../../components/BuyerOptions';
export default function Page(){return <Suspense fallback={<p className="ks-loading">…</p>}><BuyerOptions/></Suspense>;}

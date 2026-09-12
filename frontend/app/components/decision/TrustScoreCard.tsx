'use client';
import React from 'react';
import {useLanguage} from '../../../lib/LanguageContext';
import {copy} from '../../../lib/assist-copy';
import { ShieldCheck } from 'lucide-react';
import type { TrustScore } from '../../../lib/decision-platform';
import styles from './decision.module.css';

const buyerTypeLabel=(type:TrustScore['buyerType'])=>type==='LOCAL'?'Local Buyer':type==='BULK'?'Bulk Buyer':'Buyer type not recorded';
export function TrustScoreBadge({ trust }: { trust: TrustScore }) {
  const {language}=useLanguage(),c=(s:string)=>copy(language,s);
  const tier = trust.suspended ? 'LOW_TRUST' : trust.tier;
  return <span className={`${styles.badge} ${styles[tier]}`}>
    <ShieldCheck size={16} aria-hidden="true" />
    {trust.score}/100 — {c(tier.replaceAll('_', ' '))}
    {trust.suspended ? ' · '+c('Suspended') : trust.provisional ? ' · '+c('Limited history') : ''}
  </span>;
}

export default function TrustScoreCard({ trust,buyerName }: { trust: TrustScore;buyerName?:string }) {
  const {language}=useLanguage(),c=(s:string)=>copy(language,s);
  const buyer = trust.role === 'BUYER';
  const hindi=language==='hi';
  const trustLabel=trust.tier==='HIGH_TRUST'?'Bharosemand':trust.tier==='MEDIUM_TRUST'?'Theek-Thaak':'Savdhaan';
  const reliability = buyer ? trust.onTimePaymentPct : trust.onTimeFulfillmentPct;
  const metrics = [
    [hindi?'ID verified':'Verified KYC', trust.kycVerified ? (hindi?'haan':'Verified') : (hindi?'nahi':'Not verified')],
    [hindi?'Saude':'Transactions', String(trust.totalTransactions)],
    [hindi?'Time par payment':buyer ? 'On-time payments' : 'On-time fulfillment', reliability === null ? (hindi?'jaankari nahi':'Not enough evidence') : `${reliability}%`],
    [hindi?'Shikayatein':'Disputes', String(trust.disputesCount)],
    [hindi?'Order cancel':'Cancelled orders', String(trust.cancelledOrdersCount)],
    [hindi?'Kisan rating':buyer ? 'Farmer rating' : 'Buyer rating', trust.counterpartRating === null ? (hindi?'jaankari nahi':'Not enough evidence') : `${trust.counterpartRating}/5`],
  ];
  return <section className={styles.trust} aria-label={`${buyer ? 'Buyer' : 'Farmer'} Trust Score`}>
    <p className={styles.trustTitle}>{buyer&&<>{buyerName?`${buyerName} (${buyerTypeLabel(trust.buyerType)})`:`${buyerTypeLabel(trust.buyerType)}`} — </>}{hindi&&buyer?`${trust.score}/100 — ${trustLabel}`:c(buyer ? 'Buyer Trust Score' : 'Farmer Trust Score')}</p>
    <TrustScoreBadge trust={trust} />
    <dl className={styles.metrics}>{metrics.map(([label, value]) =>
      <div key={label}><dt>{c(label)}</dt><dd>{c(value)}</dd></div>)}</dl>
    <details><summary>{c('Score evidence')}</summary>
      <p>{c('On-time payments')}: {trust.onTimePayments}/{trust.eligiblePayments}; {c('Eligible orders')}: {trust.eligibleOrders}; {c('Ratings')}: {trust.ratingCount}; {c('Confirmed at-fault disputes')}: {trust.confirmedAtFaultDisputes}.</p>
      <p>{c('Evidence as of')} <time dateTime={trust.asOf}>{new Date(trust.asOf).toLocaleString(language==='hi'?'hi-IN':language==='mr'?'mr-IN':'en-IN')}</time> · {trust.formulaVersion}</p>
      <p>{c('Reliability indicator, not a payment guarantee. Filed disputes alone do not prove fault.')}</p>
    </details>
  </section>;
}

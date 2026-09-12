'use client';
import React from 'react';
import {useLanguage} from '../../../lib/LanguageContext';
import {copy} from '../../../lib/assist-copy';
import { ShieldCheck } from 'lucide-react';
import type { TrustScore } from '../../../lib/decision-platform';
import styles from './decision.module.css';

export function TrustScoreBadge({ trust }: { trust: TrustScore }) {
  const {language}=useLanguage(),c=(s:string)=>copy(language,s);
  const tier = trust.suspended ? 'LOW_TRUST' : trust.tier;
  return <span className={`${styles.badge} ${styles[tier]}`}>
    <ShieldCheck size={16} aria-hidden="true" />
    {trust.score}/100 — {c(tier.replaceAll('_', ' '))}
    {trust.suspended ? ' · '+c('Suspended') : trust.provisional ? ' · '+c('Limited history') : ''}
  </span>;
}

export default function TrustScoreCard({ trust }: { trust: TrustScore }) {
  const {language}=useLanguage(),c=(s:string)=>copy(language,s);
  const buyer = trust.role === 'BUYER';
  const reliability = buyer ? trust.onTimePaymentPct : trust.onTimeFulfillmentPct;
  const metrics = [
    ['Verified KYC', trust.kycVerified ? 'Verified' : 'Not verified'],
    ['Transactions', String(trust.totalTransactions)],
    [buyer ? 'On-time payments' : 'On-time fulfillment', reliability === null ? 'Not enough evidence' : `${reliability}%`],
    ['Disputes', String(trust.disputesCount)],
    ['Cancelled orders', String(trust.cancelledOrdersCount)],
    [buyer ? 'Farmer rating' : 'Buyer rating', trust.counterpartRating === null ? 'Not enough evidence' : `${trust.counterpartRating}/5`],
  ];
  return <section className={styles.trust} aria-label={`${buyer ? 'Buyer' : 'Farmer'} Trust Score`}>
    <p className={styles.trustTitle}>{c(buyer ? 'Buyer Trust Score' : 'Farmer Trust Score')}</p>
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

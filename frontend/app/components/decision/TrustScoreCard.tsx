import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { TrustScore } from '../../../lib/decision-platform';
import styles from './decision.module.css';

export function TrustScoreBadge({ trust }: { trust: TrustScore }) {
  const tier = trust.suspended ? 'LOW_TRUST' : trust.tier;
  return <span className={`${styles.badge} ${styles[tier]}`}>
    <ShieldCheck size={16} aria-hidden="true" />
    {trust.score}/100 — {tier.replaceAll('_', ' ')}
    {trust.suspended ? ' · Suspended' : trust.provisional ? ' · Limited history' : ''}
  </span>;
}

export default function TrustScoreCard({ trust }: { trust: TrustScore }) {
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
    <p className={styles.trustTitle}>{buyer ? 'Buyer' : 'Farmer'} Trust Score</p>
    <TrustScoreBadge trust={trust} />
    <dl className={styles.metrics}>{metrics.map(([label, value]) =>
      <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <details><summary>Score evidence</summary>
      <p>{trust.onTimePayments}/{trust.eligiblePayments} payments on time; {trust.eligibleOrders} eligible orders; {trust.ratingCount} ratings; {trust.confirmedAtFaultDisputes} confirmed at-fault disputes.</p>
      <p>As of <time dateTime={trust.asOf}>{trust.asOf.replace('T', ' ').replace('.000Z', ' UTC')}</time> · {trust.formulaVersion}</p>
      <p>Reliability indicator, not a payment guarantee. Filed disputes alone do not prove fault.</p>
    </details>
  </section>;
}

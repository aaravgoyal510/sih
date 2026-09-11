import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Recommendation } from '../../../lib/decision-platform';
import { formatPaise, signedPaise } from '../../../lib/decision-platform';
import TrustScoreCard from './TrustScoreCard';
import styles from './decision.module.css';

export default function RecommendationCard({ recommendation: r }: { recommendation: Recommendation }) {
  const wait = r.what_if_wait;
  return <article className={`ks-panel ${styles.card}`} aria-label="Explainable sell recommendation">
    <p className="ks-eyebrow"><ArrowUpRight size={16} aria-hidden="true" />YOUR TAKE-HOME DECISION</p>
    {r.synthetic && <p className={styles.notice}>Synthetic fixture — not a live buyer quote or forecast. No transaction can be made here.</p>}
    <section className={styles.field} data-decision-field="WHAT">
      <h2>WHAT</h2><p className={styles.action}>{r.what.action}</p>
      <p>{r.what.quantityKg.toLocaleString('en-IN')} kg · {r.what.timing}</p>
    </section>
    <section className={styles.field} data-decision-field="WHY">
      <h2>WHY</h2><p className={styles.delta}>Net realization {formatPaise(Math.abs(r.why.deltaPaise))} {r.why.deltaPaise >= 0 ? 'higher' : 'lower'}</p>
      <p>Expected take-home: <strong>{formatPaise(r.why.expectedNetPaise)}</strong> total</p>
      <p>Compared with {formatPaise(r.why.baselineNetPaise)}: {r.why.baselineLabel}.</p>
      <details><summary>How this estimate is calculated</summary>
        <dl className={styles.costs}><div><dt>Grade-adjusted gross</dt><dd>{formatPaise(r.why.grossPaise)}</dd></div>
          {r.why.costs.map(cost => <div key={cost.label}><dt>{cost.label}</dt><dd>−{formatPaise(cost.amountPaise)}</dd></div>)}
        </dl><p>{r.why.basis}</p>
      </details>
      {r.buyerTrust ? <TrustScoreCard trust={r.buyerTrust} /> : <p className={styles.notice}>Buyer trust: not enough evidence. Verify reliability before choosing.</p>}
    </section>
    <section className={styles.field} data-decision-field="RISK">
      <h2>RISK</h2><p className={styles.risk}>{r.risk.level}</p>
      <ul>{r.risk.basis.map(basis => <li key={basis}>{basis}</li>)}</ul>
    </section>
    <section className={styles.field} data-decision-field="WHAT IF I WAIT">
      <h2>WHAT IF I WAIT</h2>
      {wait.status === 'AVAILABLE' ? <>
        <p className={styles.wait}>Expected {signedPaise(wait.expectedDeltaPaise)}, but {wait.riskFactor} risk {wait.riskChange}</p>
        <p>Over {wait.horizonDays} days relative to selling now: downside {signedPaise(wait.downsidePaise)}; upside {signedPaise(wait.upsidePaise)}.</p>
      </> : <p>Projection unavailable: {wait.reason}</p>}
    </section>
    <footer className={styles.meta}>Evidence as of <time dateTime={r.createdAt}>{r.createdAt.replace('T', ' ').replace('.000Z', ' UTC')}</time>.<br />
      Valid until <time dateTime={r.validUntil}>{r.validUntil.replace('T', ' ').replace('.000Z', ' UTC')}</time> · {r.explanationVersion}. Revalidate before acting.</footer>
  </article>;
}

'use client';
import React from 'react';
import Link from 'next/link';
import {useLanguage} from '../../../lib/LanguageContext';
import {copy} from '../../../lib/assist-copy';
import { ArrowUpRight } from 'lucide-react';
import type { Recommendation } from '../../../lib/decision-platform';
import { formatPaise, signedPaise } from '../../../lib/decision-platform';
import TrustScoreCard from './TrustScoreCard';
import styles from './decision.module.css';

export default function RecommendationCard({ recommendation: r, trustSlot }: { recommendation: Recommendation;trustSlot?:React.ReactNode }) {
  const {language}=useLanguage(),c=(s:string)=>copy(language,s);
  const wait = r.what_if_wait;
  const hindi=language==='hi';
  const heading=hindi?{what:'KYA KAREIN',why:'KYUN',risk:'KITNA RISK',wait:'AGAR RUKEIN TO'}:{what:'WHAT',why:'WHY',risk:'RISK',wait:'WHAT IF I WAIT'};
  const riskLabel=(level:string)=>hindi?({Low:'Kam',Medium:'Madhyam',High:'Zyada'}[level]||level):level;
  const action=hindi&&r.what.counterpartyName?`Bech dein ${r.what.counterpartyName} ko`:c(r.what.action);
  return <article className={`ks-panel ${styles.card}`} aria-label="Explainable sell recommendation">
    <p className="ks-eyebrow"><ArrowUpRight size={16} aria-hidden="true" />{c('YOUR TAKE-HOME DECISION')}</p>
    {r.synthetic && <p className={styles.notice}>Synthetic fixture — not a live buyer quote or forecast. No transaction can be made here.</p>}
    {r.persisted&&<Link href={`/farmer/decisions/${r.id}`}>{c('Saved decision')}</Link>}
    <section className={styles.field} data-decision-field="WHAT">
      <h2>{heading.what}</h2><p className={styles.action}>{action} {!hindi&&r.what.counterpartyName}</p>
      <p>{r.what.quantityKg.toLocaleString('en-IN')} {c('kg')} · {c(r.what.timing)}</p>
    </section>
    <section className={styles.field} data-decision-field="WHY">
      <h2>{heading.why}</h2>{r.why.deltaPaise!==null&&<p className={styles.delta}>{hindi?`${formatPaise(Math.abs(r.why.deltaPaise))} zyada milenge`:`${c('Net realization')} ${formatPaise(Math.abs(r.why.deltaPaise))} ${c(r.why.deltaPaise >= 0 ? 'higher' : 'lower')}`}</p>}
      <p>{c('Expected take-home')}: <strong>{formatPaise(r.why.expectedNetPaise)}</strong> {c('total')}</p>
      {r.why.baselineNetPaise!==null?<p>{c('Compared with')} {formatPaise(r.why.baselineNetPaise)}: {c(r.why.baselineLabel)}.</p>:<p className={styles.notice}>{c('No local alternative entered. No income-improvement claim is made.')}</p>}
      <details><summary>{c('How this estimate is calculated')}</summary>
        <dl className={styles.costs}><div><dt>{c('Gross sale estimate')}</dt><dd>{formatPaise(r.why.grossPaise)}</dd></div>
          {r.why.costs.map(cost => <div key={cost.label}><dt>{c(cost.label)}</dt><dd>−{formatPaise(cost.amountPaise)}</dd></div>)}
        </dl><p>{c(r.why.basis)}</p>
      </details>
      {r.buyerTrust ? <TrustScoreCard trust={{...r.buyerTrust,buyerType:r.what.buyerType??r.buyerTrust.buyerType}} buyerName={r.what.counterpartyName} /> : trustSlot || <p className={styles.notice}>{c('Buyer trust: not enough evidence. Verify reliability before choosing.')}</p>}
    </section>
    <section className={styles.field} data-decision-field="RISK">
      <h2>{heading.risk}</h2><p className={styles.risk}>{riskLabel(r.risk.level)}</p>
      <ul>{r.risk.basis.map(basis => <li key={basis}>{c(basis)}</li>)}</ul>
    </section>
    <section className={styles.field} data-decision-field="WHAT IF I WAIT">
      <h2>{heading.wait}</h2>
      {wait.status === 'AVAILABLE' ? <>
        <p className={styles.wait}>{hindi?`${signedPaise(wait.expectedDeltaPaise)} aur mil sakte hain, lekin ${wait.riskFactor} ka risk ${wait.riskChange==='increases'?'badh jayega':wait.riskChange}`:`Expected ${signedPaise(wait.expectedDeltaPaise)}, but ${wait.riskFactor} risk ${wait.riskChange}`}</p>
        <p>Over {wait.horizonDays} days relative to selling now: downside {signedPaise(wait.downsidePaise)}; upside {signedPaise(wait.upsidePaise)}.</p>
      </> : <p>{c('Projection unavailable')}: {c(wait.reason)}</p>}
    </section>
    <footer className={styles.meta}>{c('Evidence as of')} <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleString(language==='hi'?'hi-IN':language==='mr'?'mr-IN':'en-IN')}</time>.<br />
      {c('Valid until')} <time dateTime={r.validUntil}>{new Date(r.validUntil).toLocaleString(language==='hi'?'hi-IN':language==='mr'?'mr-IN':'en-IN')}</time> · {r.explanationVersion}. {c('Revalidate before acting.')}</footer>
  </article>;
}

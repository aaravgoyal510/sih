'use client';
import React, { useRef, useState } from 'react';
import { request } from '../../lib/workspace';
import { copy } from '../../lib/assist-copy';
import { useLanguage } from '../../lib/LanguageContext';
import type { Recommendation } from '../../lib/decision-platform';
import RecommendationCard from './decision/RecommendationCard';
import BuyerTrust from './BuyerTrust';
import { ReadAloud } from './VoiceControls';
export default function DecisionPreview({
  listingId,
  option,
  cost,
  offerId,
}: {
  listingId: string;
  option: any;
  cost: { transport: string; other: string };
  offerId?: string;
}) {
  const { language } = useLanguage(),
    c = (s: string) => copy(language, s);
  const [baseline, setBaseline] = useState(''),
    [result, setResult] = useState<Recommendation | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [evaluated, setEvaluated] = useState('');
  const signature = JSON.stringify([cost, baseline, option.budgetPerKg, option.quantityKg]);
  const stale = evaluated !== signature;
  const valid =
    cost.transport !== '' &&
    cost.other !== '' &&
    [Number(cost.transport), Number(cost.other)].every((v) => Number.isFinite(v) && v >= 0) &&
    (!baseline || Number.isFinite(Number(baseline)));
  async function calculate() {
    if (!valid || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const d = await request('/recommendations/preview', 'POST', {
        listingId,
        requirementId: option.id,
        ...(offerId ? { offerId } : {}),
        transportPaise: Math.round(Number(cost.transport) * 100),
        otherCostsPaise: Math.round(Number(cost.other) * 100),
        ...(baseline !== '' ? { baselineNetPaise: Math.round(Number(baseline) * 100) } : {}),
      });
      setResult(d.recommendation);
      setEvaluated(signature);
    } catch {
      setError('Check the status before trying again.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <details style={{ margin: '20px 0' }}>
      <summary className="ks-button secondary">{c('Compare with my local option')}</summary>
      <div className="ks-form" style={{ marginTop: 18 }}>
        <label>
          {c('Local take-home amount for the same quantity (optional)')} (₹)
          <input
            type="number"
            step="0.01"
            value={baseline}
            onChange={(e) => setBaseline(e.target.value)}
          />
        </label>
        <p>
          {option.quantityKg} {c('kg')} ·{' '}
          {c('Enter what your local option pays after all sale costs, for this exact quantity.')}
        </p>
        <button className="ks-button" disabled={!valid || busy} onClick={calculate}>
          {c(busy ? 'Calculating…' : 'Explain this decision')}
        </button>
        {!valid && <p>{c('Enter costs to compare net value')}</p>}
        {error && <p role="alert">{c(error)}</p>}
      </div>
      {result && !stale && (
        <>
          <RecommendationCard
            recommendation={result}
            trustSlot={<BuyerTrust partyId={option.buyer.id} />}
          />
          <ReadAloud
            text={`${c(result.what.action)} ${result.what.counterpartyName}. ${c('Expected take-home')}: ${result.why.expectedNetPaise / 100}. ${c(result.risk.basis[0])}. ${result.what_if_wait.status === 'UNAVAILABLE' ? c(result.what_if_wait.reason) : ''}`}
          />
        </>
      )}
      {result && stale && (
        <p role="status">{c('Costs changed. Recalculate before using this decision.')}</p>
      )}
    </details>
  );
}

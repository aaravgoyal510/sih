'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '../../lib/LanguageContext';
import { copy } from '../../lib/assist-copy';
import { request, money } from '../../lib/workspace';
import { ReadAloud } from './VoiceControls';
import BuyerTrust from './BuyerTrust';
import DecisionPreview from './DecisionPreview';
export default function BuyerOptions() {
  const params = useSearchParams(),
    id = params.get('listingId'),
    { language } = useLanguage(),
    c = (s: string) => copy(language, s);
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [costs, setCosts] = useState<Record<string, { transport: string; other: string }>>({}),
    [busy, setBusy] = useState(''),
    [sent, setSent] = useState<string[]>([]);
  const lock = useRef(false);
  const requestKeys = useRef<Record<string, string>>({});
  async function load() {
    if (!id) return;
    try {
      setData(await request(`/sell-options/${id}`));
      setError('');
    } catch {
      setError('Check the status before trying again.');
    }
  }
  useEffect(() => {
    void load();
  }, [id]);
  async function propose(option: any) {
    if (lock.current) return;
    lock.current = true;
    setBusy(option.id);
    setError('');
    try {
      await request('/offers', 'POST', {
        clientRequestId: (requestKeys.current[`${id}:${option.id}`] ||= crypto.randomUUID()),
        listingId: id,
        requirementId: option.id,
        quantity: option.quantityKg,
        price: data.listing.price,
      });
      setSent((v) => [...v, option.id]);
      setNotice('Price proposal sent. Check your offers for the buyer response.');
    } catch {
      setError('Check the status before trying again.');
    } finally {
      lock.current = false;
      setBusy('');
    }
  }
  return (
    <div className="ks-assisted" style={{ maxWidth: 900 }}>
      <Link href="/farmer/home" className="ks-back">
        <ArrowLeft size={17} />
        {c('Go home')}
      </Link>
      <header className="ks-page-heading">
        <h1>{c('Buyer demand for your crop')}</h1>
        <button className="ks-button secondary" onClick={load}>
          <RefreshCw size={18} />
          {c('Refresh')}
        </button>
      </header>
      <p className="ks-note">
        {c('Buyer budgets are not confirmed offers. Send your price for negotiation.')}
      </p>
      {error && (
        <p role="alert" className="ks-alert error">
          {c(error)}
        </p>
      )}
      {notice && (
        <p role="status" className="ks-alert">
          {c(notice)}
          <Link href="/farmer/offers">{c('View my offers')}</Link>
        </p>
      )}
      {!id ? (
        <Link href="/farmer/home">{c('My crop')}</Link>
      ) : !data ? (
        <p className="ks-loading">{c('Loading…')}</p>
      ) : !data.options.length ? (
        <section className="ks-panel">
          <h2>{c('No compatible buyer demand yet')}</h2>
          <Link href="/farmer/prices" className="ks-button">
            {c('Compare prices')}
          </Link>
        </section>
      ) : (
        data.options.map((option: any) => {
          const cost = costs[option.id] || { transport: '', other: '' };
          const ready =
            cost.transport !== '' &&
            cost.other !== '' &&
            Number.isFinite(Number(cost.transport)) &&
            Number.isFinite(Number(cost.other)) &&
            Number(cost.transport) >= 0 &&
            Number(cost.other) >= 0;
          const gross = Number(option.budgetPerKg) * Number(option.quantityKg),
            net = gross - Number(cost.transport) - Number(cost.other);
          const line = `${c('Discuss a sale with')} ${option.buyer.name}. ${c('Quantity')}: ${option.quantityKg} ${c('kg')}. ${c('Expected take-home')}: ${ready ? money(net) : c('Enter costs to compare net value')}`;
          return (
            <article className="ks-panel" key={option.id} style={{ marginTop: 22 }}>
              <p className="ks-eyebrow">{c('WHAT')}</p>
              <h2>
                {c('Discuss a sale with')} {option.buyer.name}
              </h2>
              <p>
                {c(data.listing.attributes.crop)} · {option.buyer.district} · {option.quantityKg}{' '}
                {c('kg')}
              </p>
              <ReadAloud text={line} />
              <p className="ks-eyebrow" style={{ marginTop: 22 }}>
                {c('WHY')}
              </p>
              <p>
                {c('Quantity')}: {option.quantityKg} {c('kg')} · {money(option.budgetPerKg)}/
                {c('kg')}
              </p>
              <div className="ks-form">
                <label>
                  {c('Transport cost for this buyer')} (₹)
                  <input
                    type="number"
                    min="0"
                    value={cost.transport}
                    onChange={(e) =>
                      setCosts((v) => ({
                        ...v,
                        [option.id]: { ...cost, transport: e.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  {c('Other sale costs')} (₹)
                  <input
                    type="number"
                    min="0"
                    value={cost.other}
                    onChange={(e) =>
                      setCosts((v) => ({
                        ...v,
                        [option.id]: { ...cost, other: e.target.value },
                      }))
                    }
                  />
                </label>
              </div>
              <p className="ks-note">
                <strong>
                  {ready
                    ? `${c('Expected take-home')}: ${money(net)}`
                    : c('Enter costs to compare net value')}
                </strong>
              </p>
              {!option.requiresPooling && data.listing.status === 'OPEN' && (
                <DecisionPreview listingId={id!} option={option} cost={cost} />
              )}
              <BuyerTrust partyId={option.buyer.id} />
              <p>
                <ShieldCheck size={16} />{' '}
                {c(option.verified ? 'Verification on record' : 'Verification not on record')}
              </p>
              <p className="ks-eyebrow" style={{ marginTop: 22 }}>
                {c('RISK')}
              </p>
              <p>{c('High — indicative budget, no confirmed pickup or payment terms.')}</p>
              <p className="ks-eyebrow" style={{ marginTop: 22 }}>
                {c('WHAT IF I WAIT')}
              </p>
              <p>
                {c('No validated waiting forecast. Storage cost and crop loss may reduce returns.')}
              </p>
              {option.requiresPooling ? (
                <p className="ks-note">{c('Buyer needs a larger pooled lot')}</p>
              ) : data.listing.status !== 'OPEN' ? (
                <p>{c('This lot is no longer open for offers.')}</p>
              ) : (
                <button
                  className="ks-button full"
                  disabled={!!busy || sent.includes(option.id)}
                  style={{ marginTop: 20 }}
                  onClick={() => propose(option)}
                >
                  {c(busy ? 'Saving…' : 'Send my asking price')}: {money(data.listing.price)}/
                  {c('kg')}
                  <ArrowRight size={18} />
                </button>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}

'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MapPin, Search, ArrowRight, RefreshCw } from 'lucide-react';
import { request, resourceTitle, money } from '../../lib/workspace';
import { useLanguage } from '../../lib/LanguageContext';
import { copy } from '../../lib/assist-copy';
import { ReadAloud } from './VoiceControls';
const names: Record<string, string> = {
  COLD_STORAGE: 'Storage',
  TRANSPORT: 'Transport',
  EQUIPMENT_SERVICE: 'Equipment',
  LABOR: 'Labor',
  INPUT_GROUP_BUY: 'Inputs',
};
const unit = (listing: any) =>
  listing.priceUnit === 'per_quintal'
    ? 'quintal'
    : listing.priceUnit === 'per_kg'
      ? 'kg'
      : listing.priceUnit === 'per_day'
        ? 'day'
        : listing.priceUnit === 'per_trip'
          ? 'trip'
          : 'unit';
export default function ServiceMarket({ type }: { type: string }) {
  const { language } = useLanguage(),
    c = (s: string) => copy(language, s),
    [data, setData] = useState<any>(null),
    [query, setQuery] = useState(''),
    [selected, setSelected] = useState<any>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [quantity, setQuantity] = useState('1'),
    [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    lock = useRef(false),
    submission = useRef('');
  async function load() {
    try {
      setData(await request('/snapshot?section=market'));
      setError('');
    } catch {
      setError('Please sign in again.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  const listings =
    data?.listings.filter(
      (l: any) =>
        l.resourceType === type &&
        l.status === 'OPEN' &&
        !l.party.credibility?.suspended &&
        l.partyId !== data.party.id &&
        `${resourceTitle(l)} ${l.party.name} ${l.district} ${l.attributes.route?.from || ''} ${l.attributes.route?.to || ''}`
          .toLowerCase()
          .includes(query.toLowerCase())
    ) || [];
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || !selected) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await request('/offers', 'POST', {
        clientRequestId: submission.current,
        listingId: selected.id,
        price: selected.price,
        quantity: Number(quantity),
      });
      setNotice('Request sent. The provider must accept before a booking is confirmed.');
      setSelected(null);
    } catch {
      setError('Check the status before trying again.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="ks-assisted" style={{ maxWidth: 900 }}>
      <header className="ks-page-heading">
        <h1>{c(names[type])}</h1>
        <button className="ks-button secondary" onClick={load}>
          <RefreshCw size={18} />
          {c('Refresh')}
        </button>
      </header>
      <p className="ks-note">
        {c(
          'Check suitability, availability and the full price with the provider before confirming.'
        )}
      </p>
      <label className="ks-search">
        <Search size={20} />
        <input
          aria-label={c('Search service or district')}
          placeholder={c('Search service or district')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="ks-alert error">
          {c(error)}
        </p>
      )}
      {notice && (
        <p role="status" className="ks-alert">
          {c(notice)} <Link href="/farmer/offers">{c('View my offers')}</Link>
        </p>
      )}
      {!data ? (
        <p className="ks-loading">{c('Loading…')}</p>
      ) : !listings.length ? (
        <p className="ks-note">
          {c('No matching service is listed yet. Try another district or check again later.')}
        </p>
      ) : (
        listings.map((l: any) => (
          <article key={l.id} className="ks-panel" style={{ marginTop: 20 }}>
            <h2>{c(resourceTitle(l))}</h2>
            <p>
              <MapPin size={17} /> {l.district} · {l.party.name}
            </p>
            <dl className="ks-review-details">
              {Object.entries(l.attributes)
                .filter(([key]) =>
                  [
                    'capacityQuintal',
                    'capacityKg',
                    'crewSize',
                    'cropSuitability',
                    'packageType',
                    'includesOperator',
                    'targetQuantity',
                    'tempRange',
                  ].includes(key)
                )
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>
                      {c(
                        (
                          {
                            capacityQuintal: 'Capacity (quintals)',
                            capacityKg: 'Capacity (kg)',
                            crewSize: 'Crew size',
                            cropSuitability: 'Suitable crops',
                            packageType: 'Service package',
                            includesOperator: 'Operator included',
                            targetQuantity: 'Available units',
                            tempRange: 'Temperature range',
                          } as Record<string, string>
                        )[key]
                      )}
                    </dt>
                    <dd>
                      {Array.isArray(value)
                        ? value.map((v) => c(String(v))).join(', ')
                        : typeof value === 'boolean'
                          ? c(value ? 'Yes' : 'No')
                          : c(String(value))}
                    </dd>
                  </div>
                ))}
              {l.attributes.route && (
                <div>
                  <dt>{c('Route')}</dt>
                  <dd>
                    {l.attributes.route.from} → {l.attributes.route.to}
                  </dd>
                </div>
              )}
            </dl>
            <p className="ks-trade-value">
              <strong>
                {money(l.price)} / {c(unit(l))}
              </strong>
            </p>
            <ReadAloud
              text={`${c(names[type])}. ${l.party.name}. ${l.district}. ${money(l.price)} ${c(unit(l))}`}
            />
            <button
              className="ks-button full"
              style={{ marginTop: 14 }}
              onClick={() => {
                setSelected(l);
                setQuantity('1');
                submission.current = crypto.randomUUID();
                setError('');
              }}
            >
              {c('Request this service')}
              <ArrowRight size={18} />
            </button>
          </article>
        ))
      )}
      <dialog
        className="ks-native-dialog"
        ref={dialog}
        aria-labelledby="service-request-title"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setSelected(null);
        }}
      >
        {selected && (
          <form className="ks-form" onSubmit={send}>
            <h2 id="service-request-title">{c('Review your service request')}</h2>
            <p>
              {c(resourceTitle(selected))} · {selected.party.name}
            </p>
            <label>
              {c('Quantity')} ({c(unit(selected))})
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </label>
            <p>
              {money(selected.price)} / {c(unit(selected))}
            </p>
            <p className="ks-note">
              {c('Total value')}: <strong>{money(selected.price * Number(quantity))}</strong>
            </p>
            <p>{c('Request sent. The provider must accept before a booking is confirmed.')}</p>
            {error && <p role="alert">{c(error)}</p>}
            <button className="ks-button" disabled={busy}>
              {c(busy ? 'Saving…' : 'Confirm')}
            </button>
            <button
              type="button"
              className="ks-button secondary"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              {c('Cancel')}
            </button>
          </form>
        )}
      </dialog>
    </section>
  );
}

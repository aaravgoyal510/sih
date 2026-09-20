'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sprout,
  Package,
  ClipboardCheck,
  WifiOff,
  BarChart3,
  X,
  Star,
  MapPin,
} from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';
import { copy, cropNames } from '../../lib/assist-copy';
import { parseVoiceListing } from '../../lib/voice-listing';
import { request, money, ApiError } from '../../lib/workspace';
import VoiceInput, { ReadAloud } from './VoiceControls';
import CropIcon from './CropIcon';
import { API_URL } from '../../lib/api-config';

const MAHARASHTRA_DISTRICTS = [
  'Nashik',
  'Latur',
  'Nagpur',
  'Pune',
  'Ahmednagar',
  'Solapur',
  'Aurangabad',
  'Amravati',
  'Kolhapur',
];

const empty = {
  crop: 'Onion',
  quantity: '10',
  unit: 'quintal',
  grade: 'A',
  district: 'Nashik',
  price: '2500',
};

export default function GuidedSell() {
  const { t, language } = useLanguage();
  const c = (text: string) => copy(language, text);
  const [party, setParty] = useState<any>(null);
  const [draft, setDraft] = useState(empty);
  const [phrase, setPhrase] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [pricePopup, setPricePopup] = useState(false);
  const [nearbyPrices, setNearbyPrices] = useState<any[]>([]);
  const [priceFeed, setPriceFeed] = useState<any>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesError, setPricesError] = useState('');
  const [ready, setReady] = useState(false);
  const [customQtyMode, setCustomQtyMode] = useState(false);

  const requestId = useRef('');
  const lock = useRef(false);
  const frozen = useRef<any>(null);

  useEffect(() => {
    let active = true;
    request('/me')
      .then((d) => {
        if (!active) return;
        setParty(d.party);
        let stored: any = null;
        try {
          stored = JSON.parse(localStorage.getItem(`ks_crop_draft_${d.party.id}`) || 'null');
        } catch {}
        if (stored?.draft) {
          setDraft({ ...empty, ...stored.draft });
          requestId.current = stored.requestId || crypto.randomUUID();
          frozen.current = stored.pendingPayload || null;
        } else {
          setDraft({ ...empty, crop: 'Onion', district: d.party.district || 'Nashik' });
          requestId.current = crypto.randomUUID();
        }
        setReady(true);
      })
      .catch(() => setError('Please sign in again.'));
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      active = false;
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    if (ready && party && !saved) {
      try {
        localStorage.setItem(
          `ks_crop_draft_${party.id}`,
          JSON.stringify({
            draft,
            requestId: requestId.current,
            pendingPayload: frozen.current,
          })
        );
      } catch {}
    }
  }, [draft, party, ready, saved]);

  const update = (key: string, value: string) => {
    if (frozen.current) {
      setError('Check the status before trying again.');
      return;
    }
    setDraft((v) => ({ ...v, [key]: value }));
  };

  async function openPricePopup(forceRefresh = true) {
    setPricePopup(true);
    setPricesError('');
    setNearbyPrices([]);
    if (!draft.crop || draft.district.trim().length < 2) {
      setPricesError('Please select a crop and district first.');
      return;
    }
    setPricesLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/mandi-prices?limit=20&crop=${encodeURIComponent(draft.crop)}&district=${encodeURIComponent(draft.district.trim())}${forceRefresh ? '&refresh=1' : ''}`,
        { cache: 'no-store', signal: AbortSignal.timeout(75000) }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success || data.source !== 'AGMARKNET_LIVE')
        throw new Error('Live mandi prices are currently unavailable.');
      setPriceFeed(data);
      setNearbyPrices(
        Array.isArray(data.prices)
          ? data.prices.map((price: any) =>
              data.fallbackDistrict
                ? { ...price, market: `${price.market} (${price.district})` }
                : price
            )
          : []
      );
    } catch (e: any) {
      setPricesError(e.message || 'Prices unavailable right now.');
    } finally {
      setPricesLoading(false);
    }
  }

  function capture(text: string) {
    setPhrase(text);
    const found = parseVoiceListing(text);
    if (frozen.current) return;
    setDraft((v) => ({
      ...v,
      ...(found.crop ? { crop: found.crop } : {}),
      ...(found.quantity
        ? { quantity: String(found.quantity), unit: found.unit || 'quintal' }
        : {}),
    }));
    setMessage(
      found.crop || found.quantity
        ? 'Review the captured details below.'
        : 'We could not identify details. Choose options below.'
    );
  }

  const kg = Number(draft.quantity) * 100; // Always Quintals
  const pricePerKg = Number(draft.price) > 0 ? Number(draft.price) / 100 : 0;
  const activeDistrict = draft.district || party?.district || 'Nashik';

  const valid =
    !!draft.crop &&
    ['A', 'B', 'C'].includes(draft.grade) &&
    Number(draft.quantity) > 0 &&
    activeDistrict.trim().length >= 2 &&
    Number(draft.price) > 0 &&
    Number.isFinite(Number(draft.price));

  async function publish() {
    if (lock.current || offline || !valid || !party) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const payload = frozen.current || {
      clientRequestId: requestId.current,
      resourceType: 'CROP_LOT',
      district: activeDistrict.trim(),
      price: pricePerKg,
      priceUnit: 'per_kg',
      attributes: {
        crop: draft.crop,
        quantityKg: kg,
        qualityGrade: draft.grade,
      },
    };
    frozen.current = payload;
    try {
      localStorage.setItem(
        `ks_crop_draft_${party.id}`,
        JSON.stringify({
          draft,
          requestId: requestId.current,
          pendingPayload: payload,
        })
      );
    } catch {}
    try {
      const result = await request('/resources/listing', 'POST', payload);
      setSaved(result.listing.id);
      try {
        localStorage.removeItem(`ks_crop_draft_${party.id}`);
      } catch {}
    } catch (error) {
      if (error instanceof ApiError && [400, 401, 403, 422].includes(error.status)) {
        frozen.current = null;
        setError(
          error.status === 401
            ? 'Please sign in again.'
            : 'Please enter a valid quantity and price.'
        );
        try {
          localStorage.setItem(
            `ks_crop_draft_${party.id}`,
            JSON.stringify({ draft, requestId: requestId.current })
          );
        } catch {}
      } else
        setError(
          'We could not confirm the save. Your draft is kept. Retry the same submission safely.'
        );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  if (party && !party.roles.includes('FARMER'))
    return (
      <section className="ks-panel">
        <p>{c('This page is for farmers. Choose your own portal.')}</p>
        <Link href="/demo">{c('Switch portal')}</Link>
      </section>
    );

  if (saved)
    return (
      <section className="ks-assisted ks-panel" style={{ maxWidth: 680, margin: '20px auto', textAlign: 'center', padding: 32 }}>
        <CheckCircle2 size={64} color="#176448" style={{ margin: '0 auto 16px' }} />
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{c('Your crop is published')}</h1>
        <p style={{ fontSize: '1.1rem', color: '#475569', margin: '12px 0' }}>
          {c('Buyers can now send you offers. You decide which offer to accept.')}
        </p>
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 12, margin: '20px 0', border: '1px solid #e2e8f0' }}>
          <strong style={{ fontSize: '1.3rem', color: '#176448' }}>
            {c(draft.crop)} · {draft.quantity} {c('quintal')} ({kg.toLocaleString('en-IN')} kg)
          </strong>
          <p style={{ fontSize: '1.1rem', margin: '4px 0 0', fontWeight: 700 }}>
            {money(Number(draft.price))}/{c('quintal')} (₹{pricePerKg.toFixed(2)}/kg)
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href={`/farmer/buyers?listingId=${saved}`} className="ks-button full" style={{ minHeight: 52, fontSize: '1.1rem' }}>
            {c('Find buyers')} <ArrowRight size={20} />
          </Link>
          <Link href="/farmer/offers" className="ks-button secondary full" style={{ minHeight: 52 }}>
            {t('myOffersTitle')} <ArrowRight size={20} />
          </Link>
          <button
            className="ks-button secondary full"
            onClick={() => {
              setSaved(null);
              setDraft({ ...empty, district: activeDistrict });
              requestId.current = crypto.randomUUID();
              frozen.current = null;
              setPhrase('');
              setMessage('');
            }}
          >
            {c('Add another crop')}
          </button>
        </div>
      </section>
    );

  return (
    <div className="ks-assisted" style={{ maxWidth: 820, margin: '0 auto' }}>
      <Link className="ks-back" href="/farmer/home">
        <ArrowLeft size={18} />
        {t('backToHome')}
      </Link>

      <header className="ks-assist-heading" style={{ marginBottom: 20 }}>
        <p className="ks-eyebrow">{c('QUICK LISTING')}</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>{t('sellMyCropTitle')}</h1>
        <p style={{ fontSize: '1.05rem', color: '#64748b' }}>
          {c('Choose crop, quantity and price — tap publish.')}
        </p>
      </header>

      {offline && (
        <p className="ks-alert">
          <WifiOff size={20} />
          {c('Offline. Your draft is safe here; reconnect before publishing.')}
        </p>
      )}
      {error && (
        <p role="alert" className="ks-alert error">
          {c(error)}
        </p>
      )}

      {/* Voice Prompt Bar */}
      <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <strong style={{ fontSize: '1.1rem', color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sprout size={22} /> {t('speakToSell')}
          </strong>
          <ReadAloud text={t('speakToSell')} />
        </div>
        <VoiceInput onText={capture} />
        {phrase && <p style={{ fontSize: '0.95rem', color: '#15803d', marginTop: 8 }}>"{phrase}"</p>}
      </div>

      <section className="ks-panel" style={{ padding: 24, borderRadius: 16 }}>
        {/* 1. Crop Selection Cards */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: 12 }}>
            1. {c('Crop')}
          </label>
          <div className="ks-crop-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
            {cropNames.map((cropItem, i) => (
              <button
                type="button"
                key={cropItem}
                disabled={!!frozen.current}
                aria-pressed={draft.crop === cropItem}
                className={draft.crop === cropItem ? 'selected' : ''}
                onClick={() => update('crop', cropItem)}
                style={{
                  padding: '14px 10px',
                  borderRadius: 12,
                  border: draft.crop === cropItem ? '3px solid #176448' : '2px solid #e2e8f0',
                  background: draft.crop === cropItem ? '#e8f5e9' : '#ffffff',
                  fontWeight: draft.crop === cropItem ? 800 : 600,
                  fontSize: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span className={`ks-crop-symbol crop-${i % 4}`} style={{ width: 44, height: 44, borderRadius: 22 }}>
                  <CropIcon crop={cropItem} />
                </span>
                {c(cropItem)}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Quantity Picker: Presets + Custom Option */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: 12 }}>
            2. {c('Quantity (Quintals)')}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {['10', '20', '50'].map((qty) => (
              <button
                type="button"
                key={qty}
                className={draft.quantity === qty && !customQtyMode ? 'ks-button' : 'ks-button secondary'}
                style={{
                  minHeight: 52,
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  borderRadius: 12,
                  backgroundColor: draft.quantity === qty && !customQtyMode ? '#176448' : '#f8fafc',
                  color: draft.quantity === qty && !customQtyMode ? '#ffffff' : '#1e293b',
                  border: draft.quantity === qty && !customQtyMode ? 'none' : '2px solid #cbd5e1',
                }}
                onClick={() => {
                  setCustomQtyMode(false);
                  update('quantity', qty);
                }}
              >
                {qty} {c('quintal')} ({Number(qty) * 100} kg)
              </button>
            ))}
            <button
              type="button"
              className={customQtyMode ? 'ks-button' : 'ks-button secondary'}
              style={{
                minHeight: 52,
                fontSize: '1.05rem',
                fontWeight: 800,
                borderRadius: 12,
                backgroundColor: customQtyMode ? '#176448' : '#f8fafc',
                color: customQtyMode ? '#ffffff' : '#1e293b',
                border: customQtyMode ? 'none' : '2px solid #cbd5e1',
              }}
              onClick={() => setCustomQtyMode(true)}
            >
              {t('customAmount')}
            </button>
          </div>

          {customQtyMode && (
            <div style={{ marginTop: 12, padding: 14, background: '#f8fafc', borderRadius: 12, border: '2px solid #cbd5e1' }}>
              <label style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                {t('customAmount')} ({c('quintal')})
              </label>
              <input
                inputMode="decimal"
                type="number"
                min="0.1"
                step="any"
                placeholder="e.g. 15.5"
                value={draft.quantity}
                disabled={!!frozen.current}
                onChange={(e) => update('quantity', e.target.value)}
                style={{ width: '100%', padding: '12px 14px', fontSize: '1.1rem', borderRadius: 8, border: '1px solid #94a3b8' }}
              />
            </div>
          )}
          <p style={{ fontSize: '0.95rem', color: '#64748b', marginTop: 8 }}>
            = <strong>{kg.toLocaleString('en-IN')} kg</strong> total harvest volume
          </p>
        </div>

        {/* 3. Visual Quality Grade Selection */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: 12 }}>
            3. {c('Quality')}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              ['A', 'superQuality', '⭐⭐⭐'],
              ['B', 'mediumQuality', '⭐⭐'],
              ['C', 'faqQuality', '⭐'],
            ].map(([gradeKey, labelKey, stars]) => (
              <button
                type="button"
                key={gradeKey}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: draft.grade === gradeKey ? '3px solid #176448' : '2px solid #e2e8f0',
                  background: draft.grade === gradeKey ? '#e8f5e9' : '#ffffff',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  cursor: 'pointer',
                }}
                onClick={() => update('grade', gradeKey)}
              >
                <span style={{ fontSize: '1.2rem' }}>{stars}</span>
                <strong style={{ fontSize: '1.05rem', color: '#1e293b' }}>{t(labelKey)}</strong>
              </button>
            ))}
          </div>
        </div>

        {/* 4. District Selector with 1-Tap Fallback Pills */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: 8 }}>
            4. {t('districtLabel')}
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {MAHARASHTRA_DISTRICTS.slice(0, 5).map((d) => (
              <button
                type="button"
                key={d}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  fontSize: '0.95rem',
                  fontWeight: activeDistrict === d ? 800 : 600,
                  border: activeDistrict === d ? '2px solid #176448' : '1px solid #cbd5e1',
                  background: activeDistrict === d ? '#176448' : '#f8fafc',
                  color: activeDistrict === d ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                }}
                onClick={() => update('district', d)}
              >
                <MapPin size={14} style={{ display: 'inline', marginRight: 4 }} />
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Asking Price Input in ₹/Quintal */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
              5. {c('Asking price per quintal (₹)')}
            </label>
            <button
              type="button"
              className="ks-link"
              style={{ fontSize: '0.95rem', fontWeight: 700 }}
              onClick={(e) => {
                e.preventDefault();
                void openPricePopup();
              }}
            >
              <BarChart3 size={16} /> {c('Compare prices')} ↗
            </button>
          </div>
          <input
            type="number"
            inputMode="decimal"
            min="1"
            step="1"
            placeholder="e.g. 2500"
            value={draft.price}
            disabled={!!frozen.current}
            onChange={(e) => update('price', e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: '1.3rem',
              fontWeight: 800,
              borderRadius: 12,
              border: '2px solid #176448',
              color: '#176448',
            }}
          />
          {Number(draft.price) > 0 && (
            <div style={{ marginTop: 8, fontSize: '1rem', color: '#475569', fontWeight: 600 }}>
              = <strong>₹{(Number(draft.price) / 100).toFixed(2)} / kg</strong> · {c('Total value')}:{' '}
              <strong style={{ color: '#176448' }}>{money(kg * pricePerKg)}</strong>
            </div>
          )}
        </div>

        {/* Big Single-Tap Publish Button */}
        <button
          className="ks-button full"
          disabled={busy || offline || !valid || !party}
          onClick={publish}
          style={{
            minHeight: 60,
            fontSize: '1.25rem',
            fontWeight: 800,
            borderRadius: 14,
            backgroundColor: '#176448',
            boxShadow: '0 4px 14px rgba(23, 100, 72, 0.3)',
          }}
        >
          {busy ? c('Saving your crop…') : `${t('sellMyCropTitle')} (${money(kg * pricePerKg)})`}
          <CheckCircle2 size={24} style={{ marginLeft: 8 }} />
        </button>
      </section>

      {/* Price Comparison Modal */}
      {pricePopup && (
        <div className="ks-modal-backdrop" role="presentation" onMouseDown={() => setPricePopup(false)}>
          <section className="ks-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <header className="ks-section-heading">
              <div>
                <p className="ks-eyebrow">{c('Nearby Mandi Prices')}</p>
                <h2>{c('Compare prices')}</h2>
              </div>
              <button className="ks-icon-button" aria-label={c('Close')} onClick={() => setPricePopup(false)}>
                <X size={20} />
              </button>
            </header>
            {pricesLoading ? (
              <p className="ks-loading">{c('Checking market prices…')}</p>
            ) : pricesError ? (
              <p className="ks-alert error">{c(pricesError)}</p>
            ) : nearbyPrices.length ? (
              <dl className="ks-review-details">
                {nearbyPrices.map((price: any) => (
                  <div key={price.id}>
                    <dt>{price.market}</dt>
                    <dd>
                      <strong>{money(Math.round(Number(price.pricePerKg) * 100))} / {c('quintal')}</strong>
                      <button
                        type="button"
                        className="ks-button secondary"
                        onClick={() => {
                          update('price', String(Math.round(price.pricePerKg * 100)));
                          setPricePopup(false);
                        }}
                      >
                        {c('Use this price')}
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="ks-note">{c('No mandi prices found for this crop in your district.')}</p>
            )}
            <button type="button" className="ks-button secondary full" onClick={() => setPricePopup(false)}>
              {c('Close')}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

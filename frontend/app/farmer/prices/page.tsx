'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  MapPin,
  RefreshCw,
  WifiOff,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  SlidersHorizontal,
  Sprout,
} from 'lucide-react';
import { API_URL } from '../../../lib/api-config';
import { money } from '../../../lib/workspace';
import { useLanguage } from '../../../lib/LanguageContext';
import { copy } from '../../../lib/assist-copy';
import { ReadAloud } from '../../components/VoiceControls';

const CROPS = ['Onion', 'Soybean', 'Wheat', 'Tomato', 'Grape', 'Pomegranate'];
const DISTRICTS = ['Nashik', 'Latur', 'Nagpur', 'Pune', 'Ahmednagar', 'Solapur'];

function getPrices(crop: string, district: string, refresh = false) {
  const params = new URLSearchParams({
    crop,
    district: district || 'Nashik',
    limit: '2500',
    ...(refresh ? { refresh: '1' } : {}),
  });
  return fetch(`${API_URL}/api/mandi-prices?${params.toString()}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(75000),
  }).then(async (r) => {
    const d = await r.json();
    if (!r.ok || !d.success || !Array.isArray(d.prices)) throw new Error('Prices unavailable');
    return d;
  });
}

function savedPrices() {
  try {
    const rows = JSON.parse(localStorage.getItem('ks_verified_market_prices_v1') || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export default function Prices() {
  const { t, language } = useLanguage();
  const c = (s: string) => copy(language, s);

  const [feed, setFeed] = useState<any>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [crop, setCrop] = useState('Onion');
  const [district, setDistrict] = useState('Nashik');

  // Interactive Net Return Calculator Defaults
  const [quantity, setQuantity] = useState('1000'); // 10 Quintals = 1000 kg
  const [transport, setTransport] = useState('500'); // ₹500
  const [commission, setCommission] = useState('2'); // 2%
  const [other, setOther] = useState('0');
  const [showAdjuster, setShowAdjuster] = useState(false);

  async function load(cCrop = crop, cDistrict = district, refresh = false) {
    setLoading(true);
    const activeDist = cDistrict || 'Nashik';
    const saved = savedPrices().filter(
      (p) =>
        p.crop.toLowerCase().includes(cCrop.toLowerCase()) &&
        p.district.toLowerCase().includes(activeDist.toLowerCase())
    );
    if (saved.length) {
      setPrices(saved);
    }
    try {
      const d = await getPrices(cCrop, activeDist, refresh);
      const records = d.prices;
      setPrices(records);
      setFeed(d);
      setOffline(false);
    } catch {
      setPrices(saved);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(crop, district);
  }, [crop, district]);

  const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
  const history = prices.filter((p) => p.crop.toLowerCase().includes(crop.toLowerCase()));
  const latest = new Map<string, any>();
  for (const p of history) {
    const key = p.district + '|' + p.market;
    if (!latest.has(key) || Date.parse(p.recordedAt) > Date.parse(latest.get(key).recordedAt)) {
      latest.set(key, p);
    }
  }

  // Net earnings calculation: (Price/kg * QtyKg * (1 - Comm/100)) - Transport - Other
  const netFor = (p: any) => {
    const qtyKg = Number(quantity) || 1000;
    const trans = Number(transport) || 0;
    const comm = Number(commission) || 0;
    const oth = Number(other) || 0;
    const gross = p.pricePerKg * qtyKg;
    const net = gross * (1 - comm / 100) - trans - oth;
    return Math.round(net);
  };

  const markets = Array.from(latest.values()).sort((a, b) => netFor(b) - netFor(a));

  return (
    <div className="ks-assisted" style={{ maxWidth: 860, margin: '0 auto' }}>
      <Link className="ks-back" href="/farmer/home">
        ← {t('backToHome')}
      </Link>

      <header className="ks-page-heading" style={{ marginBottom: 16 }}>
        <div>
          <p className="ks-eyebrow">{t('mandiPricesTitle')}</p>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800 }}>{t('checkPricesTitle')}</h1>
          <p className="ks-subtitle">{c('Compare take-home value, not just the market price.')}</p>
        </div>
        <button
          className="ks-button secondary"
          onClick={() => load(crop, district, true)}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {c('Refresh')}
        </button>
      </header>

      {offline && (
        <div className="ks-alert" style={{ marginBottom: 16 }}>
          <WifiOff size={18} />
          {c('Connection unavailable. Showing saved data.')}
        </div>
      )}

      {/* 1. Crop Visual Selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: 8 }}>
          {t('cropHeader')}
        </label>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {CROPS.map((cName) => (
            <button
              type="button"
              key={cName}
              style={{
                padding: '10px 16px',
                borderRadius: 20,
                fontSize: '1rem',
                fontWeight: crop === cName ? 800 : 600,
                border: crop === cName ? '2px solid #176448' : '1px solid #cbd5e1',
                background: crop === cName ? '#176448' : '#ffffff',
                color: crop === cName ? '#ffffff' : '#334155',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
              onClick={() => setCrop(cName)}
            >
              {c(cName)}
            </button>
          ))}
        </div>
      </div>

      {/* 2. District Picker Pills with Fallback */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: 8 }}>
          {t('districtLabel')}
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DISTRICTS.map((dName) => (
            <button
              type="button"
              key={dName}
              style={{
                padding: '8px 14px',
                borderRadius: 18,
                fontSize: '0.95rem',
                fontWeight: (district || 'Nashik') === dName ? 800 : 600,
                border: (district || 'Nashik') === dName ? '2px solid #0284c7' : '1px solid #cbd5e1',
                background: (district || 'Nashik') === dName ? '#0284c7' : '#f8fafc',
                color: (district || 'Nashik') === dName ? '#ffffff' : '#334155',
                cursor: 'pointer',
              }}
              onClick={() => setDistrict(dName)}
            >
              <MapPin size={14} style={{ display: 'inline', marginRight: 4 }} />
              {dName}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Take-Home Calculator & 1-Tap Cost Adjuster */}
      <div style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: 14, padding: 18, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>{t('handNetValue')}</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#176448' }}>
              Based on 10 Quintals ({Number(quantity)} kg harvest)
            </div>
          </div>
          <button
            type="button"
            className="ks-button secondary"
            style={{ fontSize: '0.95rem', fontWeight: 700 }}
            onClick={() => setShowAdjuster((v) => !v)}
          >
            <SlidersHorizontal size={16} />
            {t('adjustCostsBtn')}
          </button>
        </div>

        {showAdjuster && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #cbd5e1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Quantity (kg)</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #94a3b8', marginTop: 4 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Transport (₹)</label>
              <input
                type="number"
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #94a3b8', marginTop: 4 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Buyer Cut (%)</label>
              <input
                type="number"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #94a3b8', marginTop: 4 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Mandi Market Return Cards */}
      <section>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 14 }}>
          {c('Nearby Mandi Prices')} ({c(crop)} · {district || 'Nashik'})
        </h2>
        {loading ? (
          <p className="ks-loading">{c('Checking market prices…')}</p>
        ) : markets.length ? (
          markets.map((p) => {
            const netVal = netFor(p);
            const ratePerQtl = Math.round(p.pricePerKg * 100);
            return (
              <div
                key={p.id}
                className="ks-panel"
                style={{
                  padding: 20,
                  borderRadius: 14,
                  marginBottom: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                  borderLeft: '5px solid #176448',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
                    <MapPin size={18} style={{ display: 'inline', marginRight: 4, color: '#176448' }} />
                    {p.market}
                  </h3>
                  <small style={{ fontSize: '0.9rem', color: '#64748b', display: 'block', marginTop: 4 }}>
                    {p.district} · {c('Observed')}: {new Date(p.recordedAt).toLocaleDateString(locale)}
                  </small>
                  <div style={{ marginTop: 8, fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>
                    {money(ratePerQtl)} / {c('quintal')} (₹{p.pricePerKg.toFixed(2)}/kg)
                  </div>
                </div>

                <div style={{ textAlign: 'right', background: '#f0fdf4', padding: '12px 18px', borderRadius: 12, border: '1px solid #bbf7d0' }}>
                  <small style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                    {t('handNetValue')}
                  </small>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#176448', marginTop: 2 }}>
                    {money(netVal)}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="ks-panel" style={{ textAlign: 'center', padding: 24 }}>
            <p>{c('No mandi prices found for this crop in your district.')}</p>
          </div>
        )}
      </section>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link href="/farmer/sell" className="ks-button full" style={{ minHeight: 52, fontSize: '1.1rem' }}>
          {t('sellMyCropTitle')}
        </Link>
      </div>
    </div>
  );
}

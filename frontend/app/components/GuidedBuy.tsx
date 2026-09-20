'use client';
import React, { useState, useEffect } from 'react';
import { Sprout, CheckCircle2, ShieldCheck, MapPin, Send, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';
import { copy } from '../../lib/assist-copy';
import { request, money } from '../../lib/workspace';

const CROPS = [
  { name: 'Onion', icon: '🧅', defaultPrice: 2600 },
  { name: 'Soybean', icon: '🌱', defaultPrice: 4800 },
  { name: 'Wheat', icon: '🌾', defaultPrice: 2400 },
  { name: 'Tomato', icon: '🍅', defaultPrice: 1800 },
  { name: 'Grape', icon: '🍇', defaultPrice: 6500 },
  { name: 'Pomegranate', icon: '🍎', defaultPrice: 8500 },
];

const QTY_PRESETS = [
  { label: '50 Qtl (5 Tons)', val: 50 },
  { label: '100 Qtl (10 Tons)', val: 100 },
  { label: '500 Qtl (50 Tons)', val: 500 },
];

const GRADES = [
  { key: 'A', labelKey: 'superQuality', desc: 'Grade A (Export / Premium)' },
  { key: 'B', labelKey: 'mediumQuality', desc: 'Grade B (Standard Market)' },
  { key: 'C', labelKey: 'faqQuality', desc: 'Grade C (Fair Average)' },
];

const DISTRICTS = ['Nashik', 'Latur', 'Nagpur', 'Pune', 'Ahmednagar', 'Solapur'];

export default function GuidedBuy({ onSuccess }: { onSuccess?: () => void }) {
  const { t, language } = useLanguage();
  const c = (s: string) => copy(language, s);

  const [party, setParty] = useState<any>(null);
  const [crop, setCrop] = useState('Onion');
  const [qty, setQty] = useState(50);
  const [customQty, setCustomQty] = useState('');
  const [useCustomQty, setUseCustomQty] = useState(false);
  const [priceQtl, setPriceQtl] = useState(2600);
  const [grade, setGrade] = useState('A');
  const [district, setDistrict] = useState('Nashik');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('maha_party') || 'null');
      if (p) {
        setParty(p);
        if (p.district) setDistrict(p.district);
      }
    } catch {}
    request('/me')
      .then((d) => {
        if (d.party) {
          setParty(d.party);
          if (d.party.district) setDistrict(d.party.district);
        }
      })
      .catch(() => {});
  }, []);

  const effectiveQty = useCustomQty ? Number(customQty) || 1 : qty;
  const pricePerKg = priceQtl / 100;
  const totalOutlay = priceQtl * effectiveQty;

  const handleCropSelect = (cropName: string, defaultPrice: number) => {
    setCrop(cropName);
    setPriceQtl(defaultPrice);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      await request('/resources/requirement', 'POST', {
        resourceType: 'CROP_LOT',
        district,
        price: priceQtl, // per quintal price sent to API
        priceUnit: 'per_quintal',
        quantityNeeded: effectiveQty,
        attributes: {
          crop,
          qualityGrade: grade,
        },
      });
      setMessage(c('Procurement demand posted successfully! Sellers will respond shortly.'));
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || c('Failed to publish demand. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header banner */}
      <div className="ks-farmer-welcome" style={{ padding: '20px 24px', borderRadius: 16, background: 'linear-gradient(135deg, #176448 0%, #0d422f 100%)', color: '#fff' }}>
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
            {c('Wholesale Procurement')}
          </span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0 0' }}>
            {t('buyerDemandTitle')}
          </h1>
          <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
            {c('Post bulk requirements directly to verified farmers and FPOs across Maharashtra')}
          </p>
        </div>
      </div>

      {message && (
        <div className="ks-alert" style={{ backgroundColor: '#e6f4ea', color: '#137333', border: '1px solid #bbf7d0', marginTop: 16, borderRadius: 10 }}>
          <CheckCircle2 size={20} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="ks-alert error" style={{ marginTop: 16 }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        {/* Step 1: Crop Selection */}
        <section className="ks-panel" style={{ padding: 20, borderRadius: 14 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 14px', color: '#1e293b' }}>
            1. {c('Select Crop')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
            {CROPS.map((cObj) => {
              const selected = crop === cObj.name;
              return (
                <button
                  type="button"
                  key={cObj.name}
                  onClick={() => handleCropSelect(cObj.name, cObj.defaultPrice)}
                  style={{
                    padding: '14px 10px',
                    borderRadius: 12,
                    border: selected ? '2px solid #176448' : '1px solid #e2e8f0',
                    background: selected ? '#e6f4ea' : '#f8fafc',
                    color: selected ? '#176448' : '#334155',
                    fontWeight: selected ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '1.8rem' }}>{cObj.icon}</span>
                  <span>{c(cObj.name)}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: Bulk Quantity */}
        <section className="ks-panel" style={{ padding: 20, borderRadius: 14, marginTop: 16 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 14px', color: '#1e293b' }}>
            2. {c('Required Bulk Quantity (Quintals)')}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {QTY_PRESETS.map((p) => {
              const selected = !useCustomQty && qty === p.val;
              return (
                <button
                  type="button"
                  key={p.val}
                  onClick={() => {
                    setUseCustomQty(false);
                    setQty(p.val);
                  }}
                  style={{
                    padding: '12px 18px',
                    borderRadius: 10,
                    border: selected ? '2px solid #176448' : '1px solid #cbd5e1',
                    background: selected ? '#176448' : '#fff',
                    color: selected ? '#fff' : '#334155',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setUseCustomQty(true)}
              style={{
                padding: '12px 18px',
                borderRadius: 10,
                border: useCustomQty ? '2px solid #176448' : '1px solid #cbd5e1',
                background: useCustomQty ? '#176448' : '#fff',
                color: useCustomQty ? '#fff' : '#334155',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              {t('customAmount')}
            </button>
          </div>

          {useCustomQty && (
            <div style={{ marginTop: 12 }}>
              <input
                type="number"
                min="1"
                placeholder={c('Enter quantity in quintals')}
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
                style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #cbd5e1', width: '100%', maxWidth: 300, fontSize: '1rem' }}
              />
            </div>
          )}
        </section>

        {/* Step 3: Target Budget per Quintal */}
        <section className="ks-panel" style={{ padding: 20, borderRadius: 14, marginTop: 16 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 14px', color: '#1e293b' }}>
            3. {c('Target Purchase Budget (₹ / Quintal)')}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <input
              type="number"
              min="100"
              step="10"
              value={priceQtl}
              onChange={(e) => setPriceQtl(Number(e.target.value))}
              style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '1.2rem', fontWeight: 700, color: '#176448', width: 200 }}
            />
            <span style={{ fontSize: '0.95rem', color: '#64748b' }}>
              (= ₹{pricePerKg.toFixed(2)} / kg)
            </span>
          </div>
        </section>

        {/* Step 4: Quality Grade */}
        <section className="ks-panel" style={{ padding: 20, borderRadius: 14, marginTop: 16 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 14px', color: '#1e293b' }}>
            4. {c('Required Quality Grade')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {GRADES.map((g) => {
              const selected = grade === g.key;
              return (
                <button
                  type="button"
                  key={g.key}
                  onClick={() => setGrade(g.key)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: selected ? '2px solid #176448' : '1px solid #e2e8f0',
                    background: selected ? '#e6f4ea' : '#f8fafc',
                    color: selected ? '#176448' : '#334155',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{t(g.labelKey)}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: 2 }}>{g.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 5: Target District & Total Financial Outlay */}
        <section className="ks-panel" style={{ padding: 20, borderRadius: 14, marginTop: 16 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 14px', color: '#1e293b' }}>
            5. {c('Target District & Financial Outlay')}
          </h3>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', marginBottom: 6 }}>
              {c('District Location')}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DISTRICTS.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDistrict(d)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: district === d ? '2px solid #176448' : '1px solid #cbd5e1',
                    background: district === d ? '#176448' : '#fff',
                    color: district === d ? '#fff' : '#334155',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Outlay Card */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 18, borderRadius: 12, marginTop: 16 }}>
            <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 600 }}>
              {t('totalFinancialOutlay')}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>
              {money(totalOutlay * 100)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#166534' }}>
              {effectiveQty} {c('quintal')} {c(crop)} @ {money(priceQtl * 100)}/{c('quintal')} ({grade} Grade) in {district}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="ks-button full"
            style={{ marginTop: 20, padding: 16, fontSize: '1.1rem', borderRadius: 12, background: '#176448' }}
          >
            <Send size={20} />
            <span>{submitting ? c('Publishing...') : t('publishDemandBtn')}</span>
          </button>
        </section>
      </form>
    </div>
  );
}

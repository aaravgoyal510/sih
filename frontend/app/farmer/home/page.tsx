'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sprout, TrendingUp, LayoutGrid, Receipt, MapPin, ArrowRight, Mic } from 'lucide-react';
import { useLanguage } from '../../../lib/LanguageContext';
import { copy } from '../../../lib/assist-copy';
import { request, money } from '../../../lib/workspace';
import { ReadAloud } from '../../components/VoiceControls';

export default function FarmerHome() {
  const { t, language } = useLanguage();
  const c = (s: string) => copy(language, s);
  const [party, setParty] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setParty(JSON.parse(localStorage.getItem('maha_party') || 'null'));
    } catch {}
    request('/farmer-home')
      .then((d) => {
        setParty(d.party);
        setError('');
      })
      .catch(() => setError('Please sign in again.'));
  }, []);

  const crops = party?.listings || [];
  const pending = crops.reduce((n: number, l: any) => n + (l.offers?.length || 0), 0);
  const activeDistrict = party?.district || 'Nashik';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header welcome banner */}
      <div className="ks-farmer-welcome" style={{ padding: '20px 24px', borderRadius: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
            {t('namaste')}, {party?.name || c('Supplier')}
          </h1>
          <p style={{ margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9 }}>
            <MapPin size={16} />
            <strong>{activeDistrict}</strong> ({c('Maharashtra')})
          </p>
        </div>
        <Sprout size={56} style={{ opacity: 0.9 }} />
      </div>

      {error && (
        <div className="ks-alert error" style={{ margin: '16px 0' }}>
          {c(error)}
          <Link href="/login">{c('Sign in to continue')}</Link>
        </div>
      )}

      {/* Hero 1-Tap Speak/Sell Button */}
      <div style={{ margin: '20px 0' }}>
        <Link
          href="/farmer/sell"
          className="ks-button full"
          style={{
            minHeight: 64,
            fontSize: '1.25rem',
            fontWeight: 800,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            backgroundColor: '#176448',
            boxShadow: '0 4px 14px rgba(23, 100, 72, 0.25)',
          }}
        >
          <Mic size={28} />
          <span>{t('speakToSell')} ({t('sellMyCropTitle')})</span>
          <ArrowRight size={22} />
        </Link>
      </div>

      <div className="ks-section-heading" style={{ marginBottom: 16 }}>
        <div>
          <h2>{c('Choose an action')}</h2>
        </div>
        <ReadAloud
          text={`${t('namaste')} ${party?.name || ''}. ${t('sellMyCropTitle')}, ${t('checkPricesTitle')}, ${t('getHelpTitle')}, ${t('myOffersTitle')}`}
        />
      </div>

      {/* Visual 4-Tile Action Grid */}
      <div className="farmer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {[
          [Sprout, 'sell', 'sellMyCropTitle', '#176448', '#e8f5e9'],
          [TrendingUp, 'prices', 'checkPricesTitle', '#0284c7', '#e0f2fe'],
          [Receipt, 'offers', 'myOffersTitle', '#d97706', '#fef3c7'],
          [LayoutGrid, 'services', 'getHelpTitle', '#4f46e5', '#e0e7ff'],
        ].map(([Icon, route, titleKey, color, bg]: any) => (
          <Link
            key={route}
            href={`/farmer/${route}`}
            className="action-button"
            style={{
              padding: 20,
              borderRadius: 14,
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textTransform: 'none',
              background: '#ffffff',
              border: '2px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'transform 0.15s ease, border-color 0.15s ease',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: bg,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Icon size={32} />
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', textAlign: 'center', lineHeight: 1.3 }}>
              {t(titleKey)}
            </span>
            {route === 'offers' && pending > 0 && (
              <span className="ks-badge good" style={{ marginTop: 8 }}>
                {pending} {c('New')}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Active Lots Summary */}
      <section className="ks-panel" style={{ marginTop: 24, borderRadius: 14 }}>
        <div className="ks-section-heading">
          <h2>{c('My crop')}</h2>
          <Link href="/farmer/offers" style={{ fontWeight: 700, color: '#176448' }}>
            {t('myOffersTitle')}: {pending}
          </Link>
        </div>
        {crops.length ? (
          crops.map((lot: any) => (
            <Link
              key={lot.id}
              href={`/farmer/buyers?listingId=${lot.id}`}
              className="ks-task-row"
              style={{ padding: '14px 16px', borderRadius: 10, marginBottom: 8, textDecoration: 'none' }}
            >
              <span>
                <strong style={{ fontSize: '1.1rem' }}>{c(lot.attributes.crop)}</strong>
                <small style={{ fontSize: '0.9rem', color: '#64748b', display: 'block', marginTop: 2 }}>
                  {(Number(lot.attributes.quantityKg) / 100).toLocaleString('en-IN')} {c('quintal')} (
                  {Number(lot.attributes.quantityKg).toLocaleString('en-IN')} {c('kg')}) ·{' '}
                  {money(lot.price * 100)}/{c('quintal')}
                </small>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#176448' }}>
                {lot.offers.length} {c('Offers')}
                <ArrowRight size={18} />
              </span>
            </Link>
          ))
        ) : (
          <p className="ks-note" style={{ textAlign: 'center', padding: '16px 0' }}>
            {c('Publish a crop so buyers can make an offer.')}
          </p>
        )}
      </section>

      {/* Footer Navigation Shortcuts */}
      <div className="ks-actions" style={{ marginTop: 24, justifyContent: 'center', gap: 16 }}>
        <Link className="ks-link" href="/farmer/account" style={{ fontSize: 14 }}>
          {c('My documents')} & {c('Verification update')}
        </Link>
        ·
        <Link className="ks-link" href="/farmer/decisions" style={{ fontSize: 14 }}>
          {c('Saved decisions')}
        </Link>
      </div>
    </div>
  );
}

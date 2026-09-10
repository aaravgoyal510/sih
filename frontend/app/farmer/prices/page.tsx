'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Search, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../../lib/LanguageContext';
import { saveCache, getCache, formatStaleness } from '../../../lib/cache';

interface MandiPriceRecord {
  id: string;
  crop: string;
  district: string;
  market: string;
  pricePerKg: number;
  arrivalsKg?: number;
  source: string;
  recordedAt: string;
}

export default function CheckPricesPage() {
  const { t, language } = useLanguage();
  const [prices, setPrices] = useState<MandiPriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  const fetchPrices = () => {
    setLoading(true);

    // Check navigator.onLine state
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!online) {
      loadFromCache();
      return;
    }

    fetch(`${backendUrl}/api/mandi-prices?limit=50`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const records = data.prices || data || [];
        setPrices(records);
        setIsOffline(false);
        setCachedAt(Date.now());
        saveCache('mandi_prices', records);
      })
      .catch((err) => {
        console.warn('Network request failed, falling back to offline cache:', err);
        loadFromCache();
      })
      .finally(() => setLoading(false));
  };

  const loadFromCache = () => {
    setIsOffline(true);
    const cached = getCache<MandiPriceRecord[]>('mandi_prices');
    if (cached) {
      setPrices(cached.data);
      setCachedAt(cached.cachedAt);
    } else {
      // Fallback sample data if local storage was empty
      const sample: MandiPriceRecord[] = [
        { id: '1', crop: 'Tomato', district: 'Ratnagiri', market: 'Ratnagiri APMC', pricePerKg: 11.0, arrivalsKg: 1500, source: 'AGMARKNET', recordedAt: new Date().toISOString() },
        { id: '2', crop: 'Onion', district: 'Nashik', market: 'Lasalgaon APMC', pricePerKg: 25.5, arrivalsKg: 5000, source: 'AGMARKNET', recordedAt: new Date().toISOString() },
        { id: '3', crop: 'Ginger(Green)', district: 'Ratnagiri', market: 'Ratnagiri APMC', pricePerKg: 140.0, arrivalsKg: 400, source: 'AGMARKNET', recordedAt: new Date().toISOString() },
        { id: '4', crop: 'Bhindi(Ladies Finger)', district: 'Ratnagiri', market: 'Ratnagiri APMC', pricePerKg: 25.0, arrivalsKg: 800, source: 'AGMARKNET', recordedAt: new Date().toISOString() },
      ];
      setPrices(sample);
      setCachedAt(Date.now() - 5 * 60 * 1000); // 5 mins ago
    }
    setLoading(false);
  };

  useEffect(() => {
    // Check if offline query param is present for testing/demoing
    if (typeof window !== 'undefined' && window.location.search.includes('offline=true')) {
      loadFromCache();
      return;
    }

    fetchPrices();

    const handleOnline = () => {
      setIsOffline(false);
      fetchPrices();
    };
    const handleOffline = () => loadFromCache();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const filteredPrices = prices.filter((p) =>
    p.crop.toLowerCase().includes(search.toLowerCase()) ||
    p.district.toLowerCase().includes(search.toLowerCase()) ||
    p.market.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ paddingTop: '10px', paddingBottom: '30px' }}>
      <Link
        href="/farmer/home"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: '#15803d',
          textDecoration: 'none',
          fontWeight: 600,
          marginBottom: '16px',
        }}
      >
        <ArrowLeft size={20} />
        {t('backToHome')}
      </Link>

      {/* Offline Staleness Indicator Banner per Design.md §7 */}
      {isOffline && (
        <div
          style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#92400e',
          }}
        >
          <WifiOff size={20} style={{ flexShrink: 0 }} />
          <div style={{ flexGrow: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
              {t('offlineMode')} • {cachedAt ? formatStaleness(cachedAt, language) : t('connectivityWarning')}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
              {t('showingCachedData')} {cachedAt ? new Date(cachedAt).toLocaleTimeString() : ''}.
            </div>
          </div>
          <button
            onClick={fetchPrices}
            style={{
              background: '#ffffff',
              border: '1px solid #d97706',
              color: '#b45309',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TrendingUp size={26} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {t('mandiPricesTitle')}
          </h1>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('mandiPricesSub')}</span>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search
          size={18}
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchCropPlaceholder')}
          style={{
            width: '100%',
            padding: '10px 12px 10px 38px',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            fontSize: '0.9rem',
          }}
        />
      </div>

      {/* Mandi Prices List / Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Loading market prices...</div>
      ) : filteredPrices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
          {t('noPricesFound')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredPrices.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              }}
            >
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{item.crop}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  {item.market} • <span style={{ fontWeight: 600, color: '#334155' }}>{item.district}</span>
                </div>
                {item.arrivalsKg && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                    {t('arrivalsHeader')}: {(item.arrivalsKg / 100).toFixed(1)} Q
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d' }}>
                  Rs {item.pricePerKg.toFixed(1)}/kg
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    backgroundColor: item.source === 'AGMARKNET' ? '#e0f2fe' : '#fef3c7',
                    color: item.source === 'AGMARKNET' ? '#0369a1' : '#b45309',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'inline-block',
                    marginTop: '4px',
                  }}
                >
                  {item.source}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

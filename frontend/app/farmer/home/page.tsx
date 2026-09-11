'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sprout, TrendingUp, LayoutGrid, Receipt, LogOut, Activity } from 'lucide-react';
import { useLanguage } from '../../../lib/LanguageContext';
import { API_URL } from '../../../lib/api-config';

interface PartyProfile {
  name: string;
  district: string;
  village?: string;
  roles: string[];
}

export default function FarmerHomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<PartyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const backendUrl = API_URL;

  useEffect(() => {
    const token = localStorage.getItem('maha_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    fetch(`${backendUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.party) {
          setProfile(data.party);
        } else {
          const stored = localStorage.getItem('maha_party');
          if (stored) setProfile(JSON.parse(stored));
        }
      })
      .catch(() => {
        const stored = localStorage.getItem('maha_party');
        if (stored) setProfile(JSON.parse(stored));
      })
      .finally(() => setLoading(false));
  }, [router, backendUrl]);

  const handleLogout = () => {
    localStorage.removeItem('maha_token');
    localStorage.removeItem('maha_party');
    router.replace('/login');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
        Loading Farmer Home...
      </div>
    );
  }

  return (
    <div>
      {/* Farmer Greeting Banner */}
      <div className="farmer-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="farmer-name">{t('namaste')}, {profile?.name || 'Farmer'}</div>
            <div className="farmer-location">
              {profile?.district || 'Nashik'} {t('districtLabel')} {profile?.village ? `• ${profile.village}` : ''}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
            }}
          >
            <LogOut size={14} />
            {t('logout')}
          </button>
        </div>
      </div>

      {/* FasalRakshak On-Farm Decision Support Module Banner */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          href="/farmer/fasalrakshak"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #15803d 0%, #047857 100%)',
            color: 'white',
            padding: '1.25rem',
            borderRadius: '1rem',
            boxShadow: '0 4px 15px rgba(21, 128, 61, 0.25)',
            textDecoration: 'none',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Activity size={28} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>FasalRakshak Advisory & Diary</span>
                <span
                  style={{
                    background: '#f59e0b',
                    color: '#78350f',
                    fontSize: '0.65rem',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                  }}
                >
                  Active
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#dcfce7', opacity: 0.9 }}>
                Daily Actions • Photo AI Crop Assistant • Cost/Kg Tracker
              </div>
            </div>
          </div>
          <div
            style={{
              background: 'white',
              color: '#15803d',
              fontWeight: '700',
              fontSize: '0.85rem',
              padding: '8px 16px',
              borderRadius: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            Open Engine
          </div>
        </Link>
      </div>

      {/* Top-Level Action Buttons with i18n support */}
      <div className="farmer-grid">
        <Link href="/farmer/sell" className="action-button">
          <div className="action-icon-wrapper sell">
            <Sprout size={32} />
          </div>
          <span className="action-title">{t('sellMyCropTitle')}</span>
          <span className="action-subtitle">{t('sellMyCropDesc')}</span>
        </Link>

        <Link href="/farmer/prices" className="action-button">
          <div className="action-icon-wrapper prices">
            <TrendingUp size={32} />
          </div>
          <span className="action-title">{t('checkPricesTitle')}</span>
          <span className="action-subtitle">{t('checkPricesDesc')}</span>
        </Link>

        <Link href="/farmer/services" className="action-button">
          <div className="action-icon-wrapper services">
            <LayoutGrid size={32} />
          </div>
          <span className="action-title">{t('getHelpTitle')}</span>
          <span className="action-subtitle">{t('getHelpDesc')}</span>
        </Link>

        <Link href="/farmer/offers" className="action-button">
          <div className="action-icon-wrapper offers">
            <Receipt size={32} />
          </div>
          <span className="action-title">{t('myOffersTitle')}</span>
          <span className="action-subtitle">{t('myOffersDesc')}</span>
        </Link>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sprout, TrendingUp, LayoutGrid, Receipt, LogOut } from 'lucide-react';
import { useLanguage } from '../../../lib/LanguageContext';

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

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

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

      {/* Exactly 4 Top-Level Action Buttons with i18n support */}
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

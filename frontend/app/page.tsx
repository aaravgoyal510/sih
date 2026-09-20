'use client';
import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Leaf,
  Users,
  Truck,
  Warehouse,
  CheckCircle2,
  Lock,
  Search,
  Scale,
} from 'lucide-react';
import { LanguageTogglePill, useLanguage } from '../lib/LanguageContext';
import { copy } from '../lib/assist-copy';

export default function RootPage() {
  const { language } = useLanguage(),
    c = (s: string) => copy(language, s);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Hero Section */}
      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '48px 24px' }}>
        <section style={{ textAlign: 'center', padding: '40px 20px 60px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#e6f4ea',
              color: '#176448',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: 20,
            }}
          >
            <ShieldCheck size={16} /> Verified Market Linkage & Escrow Security
          </div>
          <h1 style={{ fontSize: '2.75rem', fontWeight: 800, lineHeight: 1.2, color: '#0f172a', marginBottom: 20, letterSpacing: '-0.03em' }}>
            Sell Crop Lots with Assured <span style={{ color: '#176448' }}>Net Realization</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#475569', maxWidth: 720, margin: '0 auto 36px', lineHeight: 1.6 }}>
            KrishiSetu empowers farmers and FPOs to calculate actual take-home income across mandi prices, direct wholesale buyer offers, and local logistics costs with guaranteed escrow payments.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link
              href="/login"
              className="ks-button"
              style={{
                background: '#176448',
                color: '#ffffff',
                padding: '14px 28px',
                borderRadius: 10,
                fontSize: '1rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(23, 100, 72, 0.25)',
              }}
            >
              Sign In to Your Workspace <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        {/* Feature Grid */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, margin: '20px 0 60px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 28 }}>
            <div style={{ background: '#e6f4ea', color: '#176448', width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Scale size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 10, color: '#0f172a' }}>Net Take-Home Calculator</h3>
            <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.55 }}>
              Compare raw mandi quotes against direct buyer proposals minus transport and handling costs to know your exact earnings in hand.
            </p>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 28 }}>
            <div style={{ background: '#e0f2fe', color: '#0284c7', width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Lock size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 10, color: '#0f172a' }}>Guarded Escrow Payments</h3>
            <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.55 }}>
              Buyer funds are locked in secure escrow prior to dispatch and released immediately upon verified delivery confirmation.
            </p>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 28 }}>
            <div style={{ background: '#fef3c7', color: '#d97706', width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Users size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 10, color: '#0f172a' }}>Verified Buyer Network</h3>
            <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.55 }}>
              Connect directly with verified local buyers, processing exporters, and institutional wholesale procurement channels.
            </p>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 28 }}>
            <div style={{ background: '#f3e8ff', color: '#9333ea', width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Truck size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 10, color: '#0f172a' }}>Integrated Farm Logistics</h3>
            <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.55 }}>
              Book licensed WDRA cold storage capacity, heavy crop transport vehicles, and agricultural labor crews in a single portal.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff', padding: '24px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
        <div>KrishiSetu Linkage & Farm Services Platform © 2026</div>
      </footer>
    </div>
  );
}

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_ROLES } from '../components/DemoRoleSwitcherHeader';
import {
  Compass,
  ArrowRight,
  CheckCircle2,
  Building2,
  Landmark,
  ShieldCheck,
  Zap,
  Layers,
  Sparkles
} from 'lucide-react';

export default function DemoRoleSwitcherHubPage() {
  const router = useRouter();

  const handleLaunchRole = (roleItem: typeof DEMO_ROLES[0]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('maha_demo_role', roleItem.role);
      localStorage.setItem('maha_party_name', roleItem.name);
      localStorage.setItem('maha_district', roleItem.district);
    }
    router.push(roleItem.route);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header Banner */}
      <header style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '24px 32px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Compass size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                KrishiSetu <span style={{ color: '#c084fc', fontWeight: 400 }}>| SIH 2026 Demo Role-Switcher Hub</span>
              </h1>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                Seamlessly evaluate all 11 supported party roles across the Maharashtra Direct Farm Linkage & Services Engine.
              </p>
            </div>
          </div>

          <div style={{ backgroundColor: '#065f46', color: '#34d399', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} /> 100% Seed Dataset Live (Step 17 Verified)
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 24px' }}>
        
        {/* Intro Card */}
        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #334155', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              1-Click Role Evaluation Portal for Judges & Evaluators
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '6px', maxWidth: '800px' }}>
              Select any of the 11 role cards below to enter that actor's authenticated workflow immediately. All data rendered uses the real Step 17 multi-district, multi-provider dataset (Nashik, Latur, Pune, Ahmednagar, Solapur, Nagpur).
            </p>
          </div>
          <div style={{ backgroundColor: '#1e3a8a', color: '#60a5fa', padding: '12px 18px', borderRadius: '12px', border: '1px solid #2563eb', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#fbbf24" /> 11 Roles Ready
          </div>
        </div>

        {/* Roles Grid (Mobile-First 3 Column Grid) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {DEMO_ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.id}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '16px',
                  border: '1px solid #334155',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s, border-color 0.2s',
                }}
              >
                <div>
                  {/* Top Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: r.badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                      <Icon size={24} />
                    </div>
                    <span style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #334155', fontFamily: 'monospace' }}>
                      {r.role}
                    </span>
                  </div>

                  {/* Title & Seed Entity Info */}
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                    {r.title}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600, marginBottom: '2px' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '14px' }}>
                    District: {r.district}
                  </div>

                  {/* Description Box */}
                  <div style={{ backgroundColor: '#0f172a', padding: '12px 14px', borderRadius: '10px', border: '1px solid #1e293b', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '20px', minHeight: '52px' }}>
                    {r.desc}
                  </div>
                </div>

                {/* Big Icon-First Action Button */}
                <button
                  onClick={() => handleLaunchRole(r)}
                  style={{
                    width: '100%',
                    backgroundColor: r.badgeColor,
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'opacity 0.2s',
                  }}
                >
                  <Icon size={18} /> Launch {r.title} View <ArrowRight size={16} />
                </button>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}

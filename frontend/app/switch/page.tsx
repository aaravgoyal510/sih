'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert,
  Building2,
  Leaf,
  ShieldCheck,
  Sprout,
  Tractor,
  Truck,
  Users,
  Warehouse,
  ShoppingBag,
  Landmark,
  Settings2,
  ArrowRight,
} from 'lucide-react';
import { API_URL } from '../../lib/api-config';
import { destination, roleLabels } from '../../lib/workspace';

const icons: Record<string, any> = {
  FARMER: Sprout,
  FPO_ADMIN: Users,
  BUYER: ShoppingBag,
  LOCAL_BUYER: ShoppingBag,
  BULK_BUYER: ShoppingBag,
  STORAGE_OPERATOR: Warehouse,
  TRANSPORT_OPERATOR: Truck,
  EQUIPMENT_PROVIDER: Tractor,
  LABOR_CONTRACTOR: Users,
  INPUT_SUPPLIER: Leaf,
  DISTRICT_ADMIN: Building2,
  STATE_ADMIN: Landmark,
  PLATFORM_ADMIN: Settings2,
};

const descriptions: Record<string, string> = {
  FARMER: 'Farmer Workspace — Produce listings, price advisory & net realization.',
  FPO_ADMIN: 'FPO Aggregator Workspace — Group selling & collective batching.',
  LOCAL_BUYER: 'Local Buyer Workspace — Direct farm procurement & offer management.',
  BULK_BUYER: 'Bulk Wholesale Buyer Workspace — Procurement demand posting & escrow.',
  STORAGE_OPERATOR: 'Storage Operator Workspace — Warehouse capacity & WDRA listings.',
  TRANSPORT_OPERATOR: 'Transport Operator Workspace — Vehicle logistics & trip dispatch.',
  EQUIPMENT_PROVIDER: 'Equipment Provider Workspace — Tractor & harvester rentals.',
  LABOR_CONTRACTOR: 'Labor Contractor Workspace — Harvest & sowing crew contracts.',
  INPUT_SUPPLIER: 'Input Supplier Workspace — Bulk seed & fertilizer group orders.',
  DISTRICT_ADMIN: 'District Admin Workspace — Local verification & complaint handling.',
  STATE_ADMIN: 'State Admin Workspace — Statewide heatmap, verification & disputes.',
  PLATFORM_ADMIN: 'Platform Admin Workspace — System health & audit governance.',
};

export default function SwitchPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkJudgeAuth() {
      const token = localStorage.getItem('maha_token');
      if (!token) {
        setLoading(false);
        setAuthorized(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/workspace/judge-check`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setAuthorized(false);
          setLoading(false);
          return;
        }
        const checkData = await res.json();
        if (checkData.success && checkData.isJudge) {
          setAuthorized(true);
          // Fetch judge profiles
          const profRes = await fetch(`${API_URL}/api/workspace/judge-profiles`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const profData = await profRes.json();
          if (profData.success) {
            setProfiles(profData.profiles || []);
          }
        } else {
          setAuthorized(false);
        }
      } catch (err: any) {
        setAuthorized(false);
        setError(err.message || 'Authorization check failed');
      } finally {
        setLoading(false);
      }
    }
    checkJudgeAuth();
  }, []);

  async function handleSwitch(partyId: string, role: string) {
    setBusyId(partyId);
    setError('');
    const token = localStorage.getItem('maha_token');
    try {
      const res = await fetch(`${API_URL}/api/workspace/judge-switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ partyId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Switch failed');
        setBusyId(null);
        return;
      }
      localStorage.setItem('maha_token', data.token);
      localStorage.setItem('maha_party', JSON.stringify(data.party));
      router.push(destination(data.party.roles[0]));
    } catch (e: any) {
      setError(e.message || 'Switch failed');
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <p style={{ color: '#64748b', fontWeight: 600 }}>Verifying authorization...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 24 }}>
        <div style={{ maxWidth: 480, background: '#ffffff', border: '1px solid #fee2e2', borderRadius: 16, padding: 36, textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#fef2f2', color: '#dc2626', width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#991b1b', marginBottom: 12 }}>403 Access Denied</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: 24 }}>
            This evaluation switcher route is restricted to the authorized evaluator account. Normal user accounts cannot access this path.
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#176448',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: 8,
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            Sign In with Your Account <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const rank = [
    'FARMER',
    'FPO_ADMIN',
    'BUYER',
    'STORAGE_OPERATOR',
    'TRANSPORT_OPERATOR',
    'EQUIPMENT_PROVIDER',
    'LABOR_CONTRACTOR',
    'INPUT_SUPPLIER',
    'DISTRICT_ADMIN',
    'STATE_ADMIN',
    'PLATFORM_ADMIN',
  ];

  const unique = rank.flatMap((role) => {
    const candidates = profiles.filter((p) => p.roles.includes(role));
    return candidates.slice(0, role === 'BUYER' ? 2 : 1).map((p, index) => ({
      ...p,
      displayRole:
        role === 'BUYER'
          ? p.name.includes('Processing') || p.name.includes('Exports')
            ? 'BULK_BUYER'
            : index === 0
              ? 'LOCAL_BUYER'
              : 'BULK_BUYER'
          : role,
    }));
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, marginBottom: 8 }}>
              <ShieldCheck size={14} /> AUTHORIZED EVALUATION MODE
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>Judge Role Switcher</h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Select a role workspace to preview functionality in this evaluation session.</p>
          </div>
        </header>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 24, fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {unique.map((item) => {
            const IconComponent = icons[item.displayRole] || Leaf;
            const isBusy = busyId === item.id;
            return (
              <button
                type="button"
                key={item.id + item.displayRole}
                disabled={isBusy}
                onClick={() => handleSwitch(item.id, item.displayRole)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 12,
                  padding: 20,
                  textAlign: 'left',
                  cursor: isBusy ? 'wait' : 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: isBusy ? 0.6 : 1,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ background: '#f1f5f9', padding: 8, borderRadius: 8, color: '#176448' }}>
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                        {roleLabels[item.displayRole] || item.displayRole}
                      </div>
                      <small style={{ color: '#64748b', fontSize: '0.75rem' }}>{item.district}</small>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.45, marginBottom: 16 }}>
                    {descriptions[item.displayRole] || `Evaluation profile for ${item.name}`}
                  </p>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#176448', display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
                  {isBusy ? 'Switching...' : 'Enter Workspace'} <ArrowRight size={14} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

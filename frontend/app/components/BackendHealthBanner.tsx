'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle2, Server } from 'lucide-react';

export default function BackendHealthBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  const checkHealth = async () => {
    setChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${backendUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        setIsOffline(false);
      } else {
        setIsOffline(true);
      }
    } catch (err) {
      setIsOffline(true);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#7f1d1d',
        borderBottom: '1px solid #ef4444',
        color: '#fef2f2',
        padding: '10px 20px',
        fontSize: '0.85rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        zIndex: 2000,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={18} color="#fca5a5" />
        </div>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Backend Connection Offline — Start API Server on Port 4000</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#fecaca', marginTop: '2px' }}>
            Cannot reach <code style={{ backgroundColor: '#451a03', padding: '1px 6px', borderRadius: '4px', color: '#fde68a' }}>{backendUrl}</code>. Run <code style={{ backgroundColor: '#451a03', padding: '1px 6px', borderRadius: '4px', color: '#fde68a' }}>cd backend && npm run dev</code> in terminal.
          </div>
        </div>
      </div>

      <button
        onClick={checkHealth}
        disabled={checking}
        style={{
          backgroundColor: '#b91c1c',
          color: '#ffffff',
          border: '1px solid #ef4444',
          padding: '6px 14px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}
      >
        <RefreshCw size={14} className={checking ? 'spin' : ''} />
        {checking ? 'Checking...' : 'Retry Connection'}
      </button>
    </div>
  );
}

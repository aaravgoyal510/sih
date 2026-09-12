'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { API_URL } from '../../lib/api-config';

export default function BackendHealthBanner() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [detail, setDetail] = useState('Connecting to the API. A sleeping host may take about a minute to start.');
  const [slow, setSlow] = useState(false);
  const active = useRef<AbortController | null>(null);

  const checkHealth = useCallback(async () => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setStatus('checking');
    const slowTimer = setTimeout(() => setSlow(true), 4000);
    const timeout = setTimeout(() => controller.abort('timeout'), 70000);
    try {
      const response = await fetch(`${API_URL}/health`, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`API gateway returned HTTP ${response.status}. Check backend deployment logs and BACKEND_URL on the frontend host.`);
      const body = await response.json().catch(() => null);
      if (body?.status !== 'ok' || body?.service !== 'KrishiSetu API') {
        throw new Error('The health URL did not return the KrishiSetu API. Check the backend URL and redeploy the frontend.');
      }
      setStatus('online');
      setSlow(false);
    } catch (error) {
      if (controller.signal.reason === 'unmount') return;
      setStatus('offline');
      setDetail(controller.signal.aborted
        ? 'API startup timed out. The backend may be waking up; retry shortly or check its deployment logs.'
        : error instanceof Error ? error.message : 'Could not reach the API through the frontend gateway.');
    } finally {
      clearTimeout(timeout);
      clearTimeout(slowTimer);
      if (active.current === controller) active.current = null;
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    const interval = setInterval(() => { if (!document.hidden) void checkHealth(); }, 60000);
    const online = () => { void checkHealth(); };
    window.addEventListener('online', online);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', online);
      active.current?.abort('unmount');
      active.current = null;
    };
  }, [checkHealth]);

  if (status === 'online' || (status === 'checking' && !slow)) return null;
  return <aside role="status" aria-live="polite" style={{
    background: status === 'offline' ? '#7f1d1d' : '#fff4d9',
    color: status === 'offline' ? '#fff' : '#684a0c',
    padding: '12px 20px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', fontSize: 13,
  }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: '1 1 240px' }}>
      <AlertTriangle size={20} aria-hidden="true" />
      <div><strong>{status === 'checking' ? 'Connecting to backend…' : 'Backend connection unavailable'}</strong>
        <p>{status === 'checking' ? 'Waiting for the API. A sleeping host can take about a minute to start.' : detail}</p>
        {status === 'offline' && <p>Diagnostic: <a href={`${API_URL}/health`} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>API health check</a>. For a local tunnel, keep the local backend running.</p>}
      </div>
    </div>
    <button onClick={() => void checkHealth()} disabled={status === 'checking'} className="ks-button"
      style={{ minHeight: 44 }}><RefreshCw size={15} aria-hidden="true" />
      {status === 'checking' ? 'Connecting…' : 'Retry connection'}
    </button>
  </aside>;
}

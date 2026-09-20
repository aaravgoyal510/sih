'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Bell, RefreshCw } from 'lucide-react';
import { request, destination, label } from '../../lib/workspace';
import { useLanguage } from '../../lib/LanguageContext';
import { copy } from '../../lib/assist-copy';
import { ReadAloud } from './VoiceControls';
export default function UpdatesBell({ party }: { party: any }) {
  const { language } = useLanguage(),
    c = (s: string) => copy(language, s);
  const [updates, setUpdates] = useState<any[]>([]),
    [seen, setSeen] = useState<string[]>([]),
    [open, setOpen] = useState(false),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const id = party?.id;
  const currentParty = useRef(id);
  currentParty.current = id;
  async function load() {
    if (!id) return;
    setBusy(true);
    try {
      const d = await request('/updates');
      if (d.partyId === id && currentParty.current === id) {
        setUpdates(d.updates);
        setSeen(d.updates.filter((u: any) => u.readAt).map((u: any) => u.id));
        setError(false);
      }
    } catch {
      if (currentParty.current === id) setError(true);
    } finally {
      if (currentParty.current === id) setBusy(false);
    }
  }
  useEffect(() => {
    setUpdates([]);
    setOpen(false);
    try {
      const value = JSON.parse(localStorage.getItem(`ks_seen_updates_${id}`) || '[]');
      setSeen(Array.isArray(value) ? value : []);
    } catch {
      setSeen([]);
    }
    if (!id) return;
    let active = true;
    const refresh = () => {
      if (active && document.visibilityState === 'visible') void load();
    };
    const initial = setTimeout(refresh, 10000);
    const timer = setInterval(refresh, 90000);
    return () => {
      active = false;
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [id]);
  if (!id) return null;
  const unread = updates.filter((u) => !seen.includes(u.id)).length;
  const title = (u: any) =>
    u.kind === 'TRADE'
      ? (
          {
            NEW_OFFER: 'New trade offer',
            COUNTER: 'Counter-offer recorded',
            ACCEPT: 'Agreement accepted',
            REJECT: 'Offer rejected',
            FUND: 'Simulated funding recorded',
            START: 'Delivery started',
            COMPLETE: 'Delivery marked complete',
            RELEASE: 'Simulated payment released',
            CANCEL: 'Agreement cancelled',
            LOGISTICS_UPDATED: 'Delivery instructions updated',
          } as Record<string, string>
        )[u.event] || 'Offer status updated'
      : u.kind === 'VERIFICATION'
        ? 'Verification update'
        : 'Dispute update';
  async function markRead() {
    const keys = updates.map((u) => u.id);
    setBusy(true);
    try {
      await request('/updates/read', 'POST', { ids: keys });
      if (currentParty.current === id) {
        setSeen(keys);
        try {
          localStorage.setItem(`ks_seen_updates_${id}`, JSON.stringify(keys));
        } catch {}
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ks-updates">
      <button
        className="ks-icon-button"
        aria-label={`${c('Updates')}${unread ? ` (${unread})` : ''}`}
        aria-expanded={open}
        onClick={() => {
          if (!open) void load();
          setOpen((v) => !v);
        }}
      >
        <Bell size={21} />
        {unread > 0 && <b className="ks-unread">{unread}</b>}
      </button>
      {open && (
        <section className="ks-updates-panel" aria-label={c('Updates')}>
          <div className="ks-section-heading">
            <h2>{c('Updates')}</h2>
            <button
              className="ks-icon-button"
              aria-label={c('Refresh')}
              disabled={busy}
              onClick={load}
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <p className="ks-subtitle">
            {c(
              'Messages stored when trade and review actions happen. Payment events are simulations.'
            )}
          </p>
          {error ? (
            <p role="alert">{c('Check the status before trying again.')}</p>
          ) : busy && !updates.length ? (
            <p>{c('Loading…')}</p>
          ) : !updates.length ? (
            <p>{c('No updates yet')}</p>
          ) : (
            updates.map((u) => (
              <div className="ks-update" key={u.id}>
                <strong>{c(title(u))}</strong>
                <small>
                  {c(label(u.status))} ·{' '}
                  {new Date(u.recordedAt).toLocaleDateString(
                    language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN'
                  )}
                </small>
                {(() => {
                  const targetId = u.reference || u.offerId || u.bookingId || u.disputeId || u.verificationId || u.quoteId;
                  let linkHref = destination(party.roles[0], {
                    focus: targetId,
                    tab: u.kind === 'DISPUTE' ? 'disputes' : u.kind === 'TRADE' ? 'offers' : u.kind === 'VERIFICATION' ? 'verification' : undefined,
                  });

                  if (party.roles.includes('FARMER')) {
                    if (u.kind === 'TRADE') {
                      linkHref = `/farmer/offers${targetId ? `?focus=${encodeURIComponent(targetId)}` : ''}`;
                    } else if (u.kind === 'DISPUTE') {
                      linkHref = `/farmer/account?tab=disputes${targetId ? `&focus=${encodeURIComponent(targetId)}` : ''}`;
                    } else if (u.kind === 'VERIFICATION') {
                      linkHref = `/farmer/account?tab=verification${targetId ? `&focus=${encodeURIComponent(targetId)}` : ''}`;
                    } else {
                      linkHref = `/farmer/home${targetId ? `?focus=${encodeURIComponent(targetId)}` : ''}`;
                    }
                  }

                  return (
                    <Link href={linkHref} onClick={() => setOpen(false)}>
                      {c('Open workspace')}
                    </Link>
                  );
                })()}
              </div>
            ))
          )}
          <ReadAloud
            text={updates.map((u) => c(title(u)) + '. ' + c(label(u.status))).join('. ')}
          />
          <button className="ks-button secondary full" disabled={busy} onClick={markRead}>
            {c('Mark as read')}
          </button>
        </section>
      )}
    </div>
  );
}

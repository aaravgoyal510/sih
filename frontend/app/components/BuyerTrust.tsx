'use client';
import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { request } from '../../lib/workspace';
import { useLanguage } from '../../lib/LanguageContext';
import { copy } from '../../lib/assist-copy';
import TrustScoreCard from './decision/TrustScoreCard';
export default function BuyerTrust({
  partyId,
  autoLoad = false,
}: {
  partyId: string;
  autoLoad?: boolean;
}) {
  const { language } = useLanguage(),
    c = (s: string) => copy(language, s);
  const [data, setData] = useState<any>(null),
    [open, setOpen] = useState(autoLoad),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setBusy(true);
    request(`/trust/${partyId}`)
      .then((d) => {
        if (active) {
          setData(d);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [open, partyId]);
  return (
    <div style={{ marginTop: 16 }}>
      {!open ? (
        <button className="ks-button secondary" onClick={() => setOpen(true)}>
          <ShieldCheck size={19} />
          {c('View buyer trust evidence')}
        </button>
      ) : busy ? (
        <p role="status">{c('Loading…')}</p>
      ) : error ? (
        <p role="alert">
          {c('Check the status before trying again.')}{' '}
          <button onClick={() => setOpen(false)}>{c('Refresh')}</button>
        </p>
      ) : (
        data && (
          <>
            <h3>{data.buyer.name}</h3>
            <TrustScoreCard trust={data.trust} />
            <p className="ks-note">
              {c(
                'Limited evidence is not proof of misconduct. Simulated payments do not establish on-time payment history.'
              )}
            </p>
          </>
        )
      )}
    </div>
  );
}

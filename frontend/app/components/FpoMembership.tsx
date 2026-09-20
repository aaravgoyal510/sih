'use client';
import React, { useEffect, useState, useRef } from 'react';
import { request } from '../../lib/workspace';
import { copy } from '../../lib/assist-copy';
import { useLanguage } from '../../lib/LanguageContext';
import { ReadAloud } from './VoiceControls';
export default function FpoMembership({
  party,
  onSaved,
}: {
  party: any;
  onSaved: () => Promise<void>;
}) {
  const { language } = useLanguage(),
    c = (s: string) => copy(language, s);
  const [fpos, setFpos] = useState<any[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    if (!party.fpoId)
      request('/fpos')
        .then((d) => setFpos(d.fpos.filter((f: any) => f.district === party.district)))
        .catch(() => setError('Check the status before trying again.'));
  }, [party.id, party.fpoId]);
  const consent =
    'Joining allows this FPO administrator to pool your open crop lots. Read this before you agree.';
  if (!party.roles.includes('FARMER')) return <p>{c('Please sign in again.')}</p>;
  return (
    <section className="ks-panel" style={{ marginBottom: 22 }}>
      <h2>{c(party.fpoId ? 'Your producer organization' : 'Grow together with an FPO')}</h2>
      {party.fpoId ? (
        <>
          <p>{party.fpo?.name || party.fpoId}</p>
          <p>{c('Your open crop lots can be pooled by your FPO administrator.')}</p>
        </>
      ) : (
        <>
          <p>{c('Choose a producer organization in your district.')}</p>
          <ReadAloud text={c(consent)} />
          <form
            className="ks-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              try {
                const f = new FormData(e.currentTarget);
                await request('/membership', 'POST', { fpoId: f.get('fpoId') });
                await onSaved();
              } catch {
                setError('Check the status before trying again.');
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            <label>
              {c('Producer organization')}
              <select name="fpoId" required>
                <option value="">{c('Choose an FPO')}</option>
                {fpos.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <input style={{ width: 22, minHeight: 22, flexShrink: 0 }} type="checkbox" required />
              {c(consent)}
            </label>
            <button disabled={busy || !fpos.length} className="ks-button">
              {c(busy ? 'Saving…' : 'Join and allow crop pooling')}
            </button>
            {!fpos.length && <p>{c('No registered FPO is listed for your district yet.')}</p>}
          </form>
        </>
      )}
      {error && (
        <p role="alert" className="ks-alert error">
          {c(error)}
        </p>
      )}
    </section>
  );
}

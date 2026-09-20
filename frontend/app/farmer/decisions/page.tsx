'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { request, money } from '../../../lib/workspace';
import { copy } from '../../../lib/assist-copy';
import { useLanguage } from '../../../lib/LanguageContext';
export default function Decisions() {
  const { language } = useLanguage(),
    c = (s: string) => copy(language, s),
    [records, setRecords] = useState<any[] | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    request('/recommendations')
      .then((d) => setRecords(d.recommendations))
      .catch(() => setError(true));
  }, []);
  return (
    <section className="ks-assisted">
      <Link href="/farmer/home">{c('Go home')}</Link>
      <h1>{c('Saved decisions')}</h1>
      <p>{c('Recorded estimates are not completed sales. Recheck expired or changed terms.')}</p>
      {error ? (
        <p role="alert">{c('Please sign in again.')}</p>
      ) : records === null ? (
        <p>{c('Loading…')}</p>
      ) : !records.length ? (
        <p className="ks-note">{c('Compare a buyer option to save your first decision.')}</p>
      ) : (
        records.map((r) => (
          <Link
            className="ks-panel ks-task-row"
            style={{ marginTop: 15 }}
            key={r.id}
            href={`/farmer/decisions/${r.id}`}
          >
            <span>
              <strong>{r.what.counterpartyName || c(r.what.action)}</strong>
              <small>
                {r.what.quantityKg} {c('kg')} · {new Date(r.createdAt).toLocaleDateString()}
              </small>
            </span>
            <span>
              {money(r.why.expectedNetPaise / 100)}
              <small>
                {c(Date.parse(r.validUntil) < Date.now() ? 'Recheck required' : 'Estimate')}
              </small>
            </span>
          </Link>
        ))
      )}
    </section>
  );
}

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import FpoMembership from '../../components/FpoMembership';
import { request } from '../../../lib/workspace';
import { copy } from '../../../lib/assist-copy';
import { useLanguage } from '../../../lib/LanguageContext';
export default function Organization() {
  const { language } = useLanguage(),
    c = (s: string) => copy(language, s),
    [data, setData] = useState<any>(null),
    [error, setError] = useState('');
  async function load() {
    try {
      setData(await request('/snapshot?section=create'));
      setError('');
    } catch {
      setError('Please sign in again.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="ks-assisted">
      <Link href="/farmer/home">{c('Go home')}</Link>
      <h1>{c('Your producer organization')}</h1>
      {error ? (
        <p role="alert">{c(error)}</p>
      ) : data ? (
        <FpoMembership party={data.party} onSaved={load} />
      ) : (
        <p>{c('Loading…')}</p>
      )}
    </section>
  );
}

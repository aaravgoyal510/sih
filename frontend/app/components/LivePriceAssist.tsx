'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { API_URL } from '../../lib/api-config';
import { money } from '../../lib/workspace';

type Price = {
  id: string;
  district: string;
  market: string;
  pricePerKg: number;
  recordedAt: string;
};
const cache = new Map<string, Promise<any>>();
function load(crop: string, district: string, refresh = false) {
  const key = `${crop.toLowerCase()}|${district.toLowerCase()}|${refresh ? 'refresh' : 'read'}`;
  if (!cache.has(key))
    cache.set(
      key,
      fetch(
        `${API_URL}/api/mandi-prices?limit=40&crop=${encodeURIComponent(crop)}&district=${encodeURIComponent(district)}${refresh ? '&refresh=1' : ''}`,
        { cache: 'no-store', signal: AbortSignal.timeout(75000) }
      )
        .then(async (response) => {
          const body = await response.json().catch(() => null);
          if (!response.ok || !body?.success)
            throw new Error(body?.error || 'Live market prices are unavailable.');
          return body;
        })
        .finally(() => cache.delete(key))
    );
  return cache.get(key)!;
}

/** Reference price helper; this never presents an observation as a buyer offer. */
export default function LivePriceAssist({
  crop,
  district,
  onUsePrice,
}: {
  crop: string;
  district: string;
  onUsePrice: (price: number) => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [refreshing, setRefreshing] = useState(false);
  const usable = crop.trim().length > 1 && district.trim().length > 1;
  async function fetchPrices(refresh = false) {
    if (!usable) return;
    setError('');
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const local = await load(crop.trim(), district.trim(), refresh);
      // A government feed may not publish every crop in every district on a given day.
      // Keep the local result first; only widen to reported markets when it is empty.
      const result = local.prices?.length
        ? local
        : { ...(await load(crop.trim(), '', false)), fallbackDistrict: true };
      setData(result);
    } catch (e: any) {
      setData(null);
      setError(e.message || 'Live market prices are unavailable.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => {
    const timer = setTimeout(() => void fetchPrices(), 350);
    return () => clearTimeout(timer);
  }, [crop, district]);
  if (!usable)
    return (
      <p className="ks-note">Enter crop and district to check the latest mandi reference price.</p>
    );
  const rows: Price[] = (data?.prices || [])
    .filter((p: any) => Number.isFinite(p.pricePerKg) && p.pricePerKg > 0)
    .sort((a: Price, b: Price) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
  const best = rows[0];
  return (
    <section className="ks-live-price" aria-live="polite">
      <div className="ks-live-price-heading">
        <div>
          <TrendingUp size={18} />
          <strong>Live mandi reference</strong>
        </div>
        <button
          type="button"
          className="ks-link"
          onClick={() => void fetchPrices(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw className={refreshing ? 'spin' : ''} size={15} />
          Refresh
        </button>
      </div>
      {loading ? (
        <p>Checking government market feed…</p>
      ) : error ? (
        <p className="ks-live-price-error">{error} You can still enter your own asking price.</p>
      ) : best ? (
        <>
          {data.fallbackDistrict && (
            <p className="ks-live-price-disclaimer">
              No observation in {district} today; showing the latest reported market for {crop}.
            </p>
          )}
          <p>
            <strong>{money(best.pricePerKg)}/kg</strong> · {best.market}, {best.district}
          </p>
          <small>
            {data.mode === 'live'
              ? 'Latest government feed'
              : data.mode === 'stale'
                ? 'Older saved observation'
                : 'Saved market observation'}{' '}
            · observed {new Date(best.recordedAt).toLocaleDateString('en-IN')}
          </small>
          <div className="ks-actions">
            <button
              type="button"
              className="ks-button secondary"
              onClick={() => onUsePrice(best.pricePerKg)}
            >
              Use ₹{best.pricePerKg}/kg as asking price
            </button>
          </div>
          <p className="ks-live-price-disclaimer">
            Reference only—not a buyer offer. Adjust for grade, transport, commission, storage and
            your actual terms.
          </p>
        </>
      ) : (
        <p>No live reference found for this crop. Enter your own asking price.</p>
      )}
    </section>
  );
}

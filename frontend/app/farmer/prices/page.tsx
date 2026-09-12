'use client';
import React,{useEffect,useState} from 'react';
import Link from 'next/link';
import {TrendingUp,MapPin,RefreshCw,WifiOff,ArrowUpRight,ArrowDownRight,Minus} from 'lucide-react';
import {API_URL} from '../../../lib/api-config';
import {money} from '../../../lib/workspace';
import {useLanguage} from '../../../lib/LanguageContext';
import {copy} from '../../../lib/assist-copy';
import {ReadAloud} from '../../components/VoiceControls';

const CROPS = ['Onion', 'Soybean', 'Grape', 'Tomato', 'Pomegranate', 'Wheat', 'Maize', 'Bajra', 'Jowar', 'Bengal Gram'];
const DISTRICTS = ['Nashik', 'Nagpur', 'Solapur', 'Pune', 'Latur', 'Ahmednagar'];

function getPrices(crop: string, district: string, refresh = false) {
  const params = new URLSearchParams({
    crop,
    district,
    limit: '2500',
    ...(refresh ? { refresh: '1' } : {}),
  });
  return fetch(`${API_URL}/api/mandi-prices?${params.toString()}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(75000),
  }).then(async r => {
    const d = await r.json();
    if (!r.ok || !d.success || !Array.isArray(d.prices)) throw new Error('Prices unavailable');
    return d;
  });
}

function savedPrices(){
  try {
    const rows = JSON.parse(localStorage.getItem('ks_verified_market_prices_v1') || '[]');
    return Array.isArray(rows) ? rows.filter(p => typeof p.crop === 'string' && typeof p.market === 'string' && typeof p.district === 'string' && Number.isFinite(p.pricePerKg) && p.pricePerKg > 0 && Number.isFinite(Date.parse(p.recordedAt))) : [];
  } catch {
    return [];
  }
}

function cacheFeed(records: any[]) {
  const latest = records.reduce((last, p) => Date.parse(p.recordedAt) > Date.parse(last || '1970-01-01') ? p.recordedAt : last, null);
  return { mode: latest && Date.now() - Date.parse(latest) > 72 * 3600000 ? 'stale' : 'cached', source: 'Saved observations', lastObservedAt: latest, lastFetchedAt: null };
}

export default function Prices() {
  const { t, language } = useLanguage(), c = (s: string) => copy(language, s);
  const [feed, setFeed] = useState<any>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [crop, setCrop] = useState('Onion');
  const [district, setDistrict] = useState('Nashik');
  const [quantity, setQuantity] = useState('');
  const [transport, setTransport] = useState('');
  const [commission, setCommission] = useState('');
  const [other, setOther] = useState('0');
  const [routeCosts, setRouteCosts] = useState<Record<string, string>>({});

  async function load(cCrop = crop, cDistrict = district, refresh = false) {
    setLoading(true);
    const saved = savedPrices().filter(p => p.crop.toLowerCase().includes(cCrop.toLowerCase()) && p.district.toLowerCase().includes(cDistrict.toLowerCase()));
    if (saved.length) { setPrices(saved); setFeed(cacheFeed(saved)); }
    try {
      const d = await getPrices(cCrop, cDistrict, refresh);
      const records = d.prices;
      setPrices(records);
      setFeed({ ...d, ...(!records.length && saved.length ? cacheFeed(saved) : {}) });
      setOffline(false);
      if (records.length) {
        try {
          const existing = savedPrices().filter(p => !(p.crop === cCrop && p.district === cDistrict));
          localStorage.setItem('ks_verified_market_prices_v1', JSON.stringify([...existing, ...records]));
        } catch {}
      }
    } catch {
      setPrices(saved);
      setOffline(true);
      setFeed(saved.length ? cacheFeed(saved) : { mode: 'unavailable', source: 'AGMARKNET_LIVE' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(crop, district);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load(crop, district);
    }, 5 * 60000);
    const online = () => void load(crop, district, true);
    window.addEventListener('online', online);
    return () => { clearInterval(timer); window.removeEventListener('online', online); };
  }, [crop, district]);

  const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
  const history = prices.filter(p => p.crop.toLowerCase().includes(crop.toLowerCase()));
  const latest = new Map<string, any>();
  for (const p of history) {
    const key = p.district + '|' + p.market;
    if (!latest.has(key) || Date.parse(p.recordedAt) > Date.parse(latest.get(key).recordedAt)) {
      latest.set(key, p);
    }
  }

  const inputValid = quantity !== '' && commission !== '' && other !== '' && [Number(quantity), Number(commission), Number(other)].every(Number.isFinite) && Number(quantity) > 0 && Number(commission) >= 0 && Number(commission) <= 100 && Number(other) >= 0;
  const costFor = (p: any) => routeCosts[p.id] ?? transport;
  const netFor = (p: any) => inputValid && costFor(p) !== '' && Number.isFinite(Number(costFor(p))) && Number(costFor(p)) >= 0 ? Math.round((p.pricePerKg * Number(quantity) * (1 - Number(commission) / 100) - Number(costFor(p)) - Number(other)) * 100) / 100 : null;
  const markets = Array.from(latest.values()).sort((a, b) => { const an = netFor(a), bn = netFor(b); return an !== null && bn !== null ? bn - an : an !== null ? -1 : bn !== null ? 1 : b.pricePerKg - a.pricePerKg; });

  const daily = new Map<string, number[]>();
  for (const p of history.filter(p => p.district.toLowerCase().includes(district.toLowerCase()))) {
    const day = p.recordedAt.slice(0, 10);
    daily.set(day, [...(daily.get(day) || []), p.pricePerKg]);
  }

  const series = Array.from(daily.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([day, values]) => ({ day, value: values.reduce((s, n) => s + n, 0) / values.length })).slice(-14);

  const latestObs = series.length ? series[series.length - 1] : null;
  const initialObs = series.length ? series[0] : null;
  const priceChange = (latestObs && initialObs && series.length > 1) ? Number((latestObs.value - initialObs.value).toFixed(2)) : null;
  const pctChange = (initialObs && initialObs.value > 0 && priceChange !== null) ? Number(((priceChange / initialObs.value) * 100).toFixed(1)) : null;

  const values = series.map(p => p.value);
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 100;
  const spread = maxVal - minVal || 1;
  const lo = Math.max(0, minVal - spread * 0.15);
  const hi = maxVal + spread * 0.15;
  const range = hi - lo || 1;

  const cropOptions = Array.from(new Set([...CROPS, crop, ...prices.map(p => p.crop)])).sort();
  const districtOptions = Array.from(new Set([...DISTRICTS, district, ...prices.map(p => p.district)])).sort();

  return (
    <div className="ks-assisted" style={{ maxWidth: 1160 }}>
      <Link className="ks-back" href="/farmer/home">← {t('backToHome')}</Link>
      <header className="ks-page-heading">
        <div>
          <p className="ks-eyebrow">{c('WHAT REACHES YOUR POCKET')}</p>
          <h1>{t('mandiPricesTitle')}</h1>
          <p className="ks-subtitle">{c('Compare take-home value, not just the market price.')}</p>
        </div>
        <button className="ks-button secondary" onClick={() => load(crop, district, true)} disabled={loading}>
          <RefreshCw size={17} />{c('Refresh')}
        </button>
      </header>

      {feed && (
        <section className="ks-panel" style={{ marginBottom: 20 }} aria-live="polite">
          <div className="ks-section-heading">
            <h2>{c(({ live: 'Latest government feed', cached: 'Saved verified feed', stale: 'Older market observations', unavailable: 'Live feed unavailable' } as Record<string, string>)[feed.mode] || 'Live feed unavailable')}</h2>
            <span className="ks-badge">{feed.source}</span>
          </div>
          <p>{c('Mandi reports are observations, not guaranteed buyer offers.')}</p>
          <p>{c('Last fetched')}: {feed.lastFetchedAt ? new Date(feed.lastFetchedAt).toLocaleString(locale) : c('Not available')} · {c('Latest observation')}: {feed.lastObservedAt ? new Date(feed.lastObservedAt).toLocaleDateString(locale) : c('Not available')}</p>
          <p className="ks-subtitle">{c('Reference prices average available varieties for each market, crop and day; they are not your quality-specific quote.')}</p>
          <small>{c('Auto-check every 5 minutes. No invented prices or forecasts.')}</small>
          {feed.warning && <p className="ks-note">{feed.warning}</p>}
        </section>
      )}

      {offline && <div className="ks-alert"><WifiOff size={18} />{c('Connection unavailable. Only saved observations are shown.')}</div>}

      <div className="ks-toolbar">
        <label>{c('Crop')}
          <select aria-label={c('Crop')} value={crop} onChange={e => setCrop(e.target.value)}>
            {cropOptions.map(value => <option key={value} value={value}>{c(value)}</option>)}
          </select>
        </label>
        <label>{c('District')}
          <select aria-label={c('District')} value={district} onChange={e => setDistrict(e.target.value)}>
            {districtOptions.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>

      <div className="ks-two-column">
        <section className="ks-panel">
          <h2>{c('Net value calculator')}</h2>
          <p className="ks-subtitle">{c('Enter actual costs. Use 0 only when there is no charge.')}</p>
          <div className="ks-form">
            <label>{c('Quantity (kg)')}<input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
            <label>{c('Total transport cost')} (₹)<input type="number" min="0" value={transport} onChange={e => setTransport(e.target.value)} /></label>
            <label>{c('Commission (%)')}<input type="number" min="0" max="100" value={commission} onChange={e => setCommission(e.target.value)} /></label>
            <label>{c('Other sale costs')} (₹)<input type="number" min="0" value={other} onChange={e => setOther(e.target.value)} /></label>
          </div>
          <p className="ks-note">{c('The transport amount is a starting estimate. Set a different route cost on each market card.')}</p>
        </section>

        <section className="ks-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2>{c(crop)} · {district}</h2>
              {latestObs && (
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#176448', letterSpacing: '-0.5px' }}>
                    {money(latestObs.value)}/<small style={{ fontSize: '1.2rem', fontWeight: 600 }}>kg</small>
                  </span>
                  {priceChange !== null && initialObs && (
                    <span
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        backgroundColor: priceChange > 0 ? '#e6f4ea' : priceChange < 0 ? '#fce8e6' : '#f1f3f4',
                        color: priceChange > 0 ? '#137333' : priceChange < 0 ? '#c5221f' : '#5f6368',
                      }}
                    >
                      {priceChange > 0 ? <ArrowUpRight size={15} /> : priceChange < 0 ? <ArrowDownRight size={15} /> : <Minus size={15} />}
                      {priceChange > 0 ? `+${money(priceChange)}` : priceChange < 0 ? `−${money(Math.abs(priceChange))}` : '₹0.00'}
                      {pctChange !== null && ` (${priceChange >= 0 ? '+' : ''}${pctChange}%)`} {c('since')} {initialObs.day}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {series.length > 1 ? (
            <div style={{ marginTop: 16 }}>
              <svg viewBox="0 0 600 210" role="img" aria-label={c('Observed price history')} style={{ width: '100%', height: 210, overflow: 'visible' }}>
                {/* Horizontal reference grid lines */}
                <line x1="35" y1="35" x2="575" y2="35" stroke="#e6ece8" strokeDasharray="3 3" />
                <text x="30" y="39" textAnchor="end" fontSize="10" fill="#888">{money(hi)}</text>

                <line x1="35" y1="155" x2="575" y2="155" stroke="#e6ece8" strokeDasharray="3 3" />
                <text x="30" y="159" textAnchor="end" fontSize="10" fill="#888">{money(lo)}</text>

                {/* Trend line */}
                <polyline
                  fill="none"
                  stroke="#176448"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={series.map((p, i) => `${35 + i * 540 / (series.length - 1)},${155 - (p.value - lo) / range * 120}`).join(' ')}
                />

                {/* Data point nodes with legible rupee price labels */}
                {series.map((p, i) => {
                  const cx = 35 + i * 540 / (series.length - 1);
                  const cy = 155 - (p.value - lo) / range * 120;
                  const isLast = i === series.length - 1;
                  return (
                    <g key={p.day}>
                      {/* Price label directly above each node */}
                      <rect
                        x={cx - 28}
                        y={cy - 27}
                        width="56"
                        height="18"
                        rx="4"
                        fill={isLast ? '#176448' : '#ffffff'}
                        stroke={isLast ? '#176448' : '#cbd5e1'}
                        strokeWidth="1"
                      />
                      <text
                        x={cx}
                        y={cy - 14}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight={isLast ? '700' : '600'}
                        fill={isLast ? '#ffffff' : '#1e293b'}
                      >
                        {money(p.value)}
                      </text>

                      {/* Circle node */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isLast ? '5' : '4'}
                        fill={isLast ? '#176448' : '#ffffff'}
                        stroke="#176448"
                        strokeWidth="2.5"
                      >
                        <title>{p.day}: {money(p.value)}/kg</title>
                      </circle>

                      {/* Date label directly below */}
                      <text x={cx} y="182" textAnchor="middle" fontSize="10" fontWeight="500" fill="#64748b">
                        {p.day.slice(5)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                <span>{c('Observed range')}: {series[0].day} → {series[series.length - 1].day}</span>
                <span>{series.length} {c('observations')}</span>
              </div>
            </div>
          ) : series.length === 1 ? (
            <div className="ks-panel" style={{ margin: '14px 0', padding: '16px', background: 'var(--ks-bg-subtle,#f4f8f6)', borderRadius: '8px', borderLeft: '4px solid #176448' }}>
              <p className="ks-eyebrow" style={{ marginBottom: 4 }}>{c('Latest Recorded Price')}</p>
              <h3 style={{ fontSize: '2rem', margin: '4px 0', color: '#176448', fontWeight: 800 }}>{money(series[0].value)}/kg</h3>
              <p style={{ fontSize: '0.9rem', color: '#555', margin: '4px 0' }}>{c('Observed date')}: {series[0].day}</p>
              <span className="ks-badge" style={{ marginTop: 8, display: 'inline-block' }}>{c('Single observation on record — 2+ dates needed for trend graph')}</span>
            </div>
          ) : (
            <div className="ks-empty">
              <TrendingUp size={32} />
              <h3>{c('No observations yet')}</h3>
              <p>{c('No price observations reported for this crop and district combination.')}</p>
            </div>
          )}
          <p className="ks-note">{c('History is not a forecast. Quality, weather, storage cost and spoilage can change your result.')}</p>
          <Link href="/farmer/sell" className="ks-button secondary">{c('Sell my crop')}</Link>
        </section>
      </div>

      <section style={{ marginTop: 25 }}>
        <h2>{c('Compare market returns')}</h2>
        <p className="ks-subtitle">{c('Costed options are sorted by estimated net value. Uncosted options show observed price only.')}</p>
        {loading && <p role="status">{c('Checking the feed…')}</p>}
        {markets.length ? (
          markets.map(p => {
            const net = netFor(p), cost = costFor(p);
            return (
              <article className="ks-panel ks-row ks-market-decision" key={p.id} style={{ display: 'block', marginTop: 20 }}>
                <div data-decision-field="WHAT">
                  <p className="ks-eyebrow">{c('WHAT')}</p>
                  <h3><MapPin size={21} /> {c('Check a sale at')} {p.market}</h3>
                  <p>{p.district} · {p.source} · {c('Observed')}: {new Date(p.recordedAt).toLocaleDateString(locale)}</p>
                </div>
                <div data-decision-field="WHY">
                  <p className="ks-eyebrow">{c('WHY')}</p>
                  <p>{money(p.pricePerKg)}/{c('kg')}</p>
                  <label className="ks-assist-label">{c('Transport cost for this market')} (₹)
                    <input type="number" min="0" value={cost} onChange={e => setRouteCosts(v => ({ ...v, [p.id]: e.target.value }))} />
                  </label>
                  <p className="ks-note"><strong>{net === null ? c('Enter costs to compare net value') : `${c('Estimated net')}: ${money(net)}`}</strong></p>
                  {net !== null && <small>{money(p.pricePerKg * Number(quantity))} − {money(Number(cost))} − {money(p.pricePerKg * Number(quantity) * Number(commission) / 100)} − {money(Number(other))}</small>}
                </div>
                <div data-decision-field="RISK">
                  <p className="ks-eyebrow">{c('RISK')}</p>
                  <p>{c('High — market reference only. Your grade, buyer, pickup and final rate are unconfirmed.')}</p>
                </div>
                <div data-decision-field="WHAT IF I WAIT">
                  <p className="ks-eyebrow">{c('WHAT IF I WAIT')}</p>
                  <p>{c('No validated waiting forecast. Storage cost and crop loss may reduce returns.')}</p>
                </div>
                <ReadAloud text={`${c('Check a sale at')} ${p.market}. ${net === null ? c('Enter costs to compare net value') : c('Estimated net') + ' ' + money(net)}. ${c('High — market reference only. Your grade, buyer, pickup and final rate are unconfirmed.')}`} />
              </article>
            );
          })
        ) : !loading && (
          <div className="ks-panel">
            <p>{c('No saved prices for this crop. Try another crop or check again later.')}</p>
          </div>
        )}
      </section>
    </div>
  );
}

import { Language } from './translations';

export interface CacheEntry<T> {
  data: T;
  cachedAt: number; // UTC timestamp ms
}

export function saveCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
    };
    localStorage.setItem(`maha_cache_${key}`, JSON.stringify(entry));
  } catch (err) {
    console.warn('Failed to save to localStorage cache:', err);
  }
}

export function getCache<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(`maha_cache_${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch (err) {
    console.warn('Failed to read from localStorage cache:', err);
    return null;
  }
}

/**
 * Format staleness duration (e.g. "Cached 5 minutes ago" / Devanagari numerals)
 */
export function formatStaleness(cachedAt: number, lang: Language = 'en'): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - cachedAt) / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (lang === 'mr') {
    if (diffMin < 1) return 'काही सेकंदांपूर्वी कॅश केलेले';
    if (diffMin < 60) return `${toDevanagariNumerals(diffMin)} मिनिटांपूर्वी कॅश केलेले`;
    return `${toDevanagariNumerals(diffHours)} तासांपूर्वी कॅश केलेले`;
  }

  if (lang === 'hi') {
    if (diffMin < 1) return 'कुछ सेकंड पहले कैश्ड';
    if (diffMin < 60) return `${toDevanagariNumerals(diffMin)} मिनट पहले कैश्ड`;
    return `${toDevanagariNumerals(diffHours)} घंटे पहले कैश्ड`;
  }

  // English default
  if (diffMin < 1) return 'Cached a few seconds ago';
  if (diffMin < 60) return `Cached ${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  return `Cached ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
}

function toDevanagariNumerals(num: number): string {
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return num
    .toString()
    .split('')
    .map((d) => (parseInt(d, 10) >= 0 ? devanagariDigits[parseInt(d, 10)] : d))
    .join('');
}

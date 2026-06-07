/**
 * Stargazer - Space environment (geomagnetic) data
 *
 * Fetches the planetary Kp index from NOAA SWPC. Kept out of the API route so the
 * pure parsing logic can be unit tested without a network call.
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

const KP_CURRENT_URL =
  'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const KP_FORECAST_URL =
  'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';

export interface KpReading {
  /** Most recent observed Kp (0-9), null if unavailable */
  current: number | null;
  /** Max expected Kp over the forecast horizon, null if unavailable */
  forecastMax: number | null;
}

/**
 * Pull a numeric Kp value from one row of a NOAA SWPC product. The endpoints have
 * shipped in two shapes over time: array-of-objects ({ Kp } or { kp }) and the
 * legacy array-of-arrays ([time_tag, Kp, ...]). Returns null if neither matches.
 */
export function parseKpRow(row: unknown): number | null {
  if (Array.isArray(row)) {
    const v = parseFloat(String(row[1]));
    return Number.isNaN(v) ? null : v;
  }
  if (row && typeof row === 'object') {
    const obj = row as Record<string, unknown>;
    const raw = obj.Kp ?? obj.kp ?? obj.kp_index;
    if (raw != null) {
      const v = parseFloat(String(raw));
      return Number.isNaN(v) ? null : v;
    }
  }
  return null;
}

/** Pull the time_tag from a SWPC row (array index 0 or object key), or '' if absent. */
export function parseKpTimeTag(row: unknown): string {
  if (Array.isArray(row)) {
    return typeof row[0] === 'string' ? row[0] : '';
  }
  if (row && typeof row === 'object') {
    const tt = (row as Record<string, unknown>).time_tag;
    return typeof tt === 'string' ? tt : '';
  }
  return '';
}

/** Parse one SWPC row into a { timeTag, kp } entry, or null if it has no numeric Kp. */
export function parseKpEntry(row: unknown): { timeTag: string; kp: number } | null {
  const kp = parseKpRow(row);
  if (kp == null) return null;
  return { timeTag: parseKpTimeTag(row), kp };
}

/** Most recent numeric Kp from a SWPC current-index payload, or null. */
export function extractCurrentKp(rows: unknown): number | null {
  if (!Array.isArray(rows)) return null;
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = parseKpRow(rows[i]);
    if (v != null) return v;
  }
  return null;
}

/**
 * Max Kp from a SWPC forecast payload, preferring rows flagged predicted and
 * bounded to the next ~24h (8 rows of 3-hour intervals). Returns null only when
 * no row yields a numeric Kp; a genuine all-quiet (0) forecast returns 0.
 */
export function extractForecastMaxKp(rows: unknown): number | null {
  if (!Array.isArray(rows)) return null;
  const predicted = rows.filter(
    (r) => r && typeof r === 'object' && (r as Record<string, unknown>).observed === 'predicted',
  );
  const pool = (predicted.length > 0 ? predicted : rows).slice(0, 8);
  let max: number | null = null;
  for (const row of pool) {
    const v = parseKpRow(row);
    if (v != null) max = max == null ? v : Math.max(max, v);
  }
  return max;
}

/**
 * Fetch the current planetary Kp index and the max expected Kp over the next ~24h
 * from NOAA SWPC. Best-effort: returns nulls on any failure so the page still renders.
 */
export async function fetchKpIndex(): Promise<KpReading> {
  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetchWithTimeout(KP_CURRENT_URL, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 900 },
      }).catch(() => null),
      fetchWithTimeout(KP_FORECAST_URL, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 900 },
      }).catch(() => null),
    ]);

    let current: number | null = null;
    if (currentRes && currentRes.ok) {
      current = extractCurrentKp(await currentRes.json());
    }

    let forecastMax: number | null = null;
    if (forecastRes && forecastRes.ok) {
      forecastMax = extractForecastMaxKp(await forecastRes.json());
    }

    return { current, forecastMax };
  } catch (error) {
    console.error('[Stargazer] Kp index fetch failed:', error);
    return { current: null, forecastMax: null };
  }
}

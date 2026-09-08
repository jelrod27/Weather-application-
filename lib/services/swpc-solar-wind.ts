/**
 * Parse NOAA SWPC real-time solar wind (RTSW) JSON feeds.
 * Legacy `products/solar-wind/plasma-*-day.json` URLs now 404; use
 * `json/rtsw/rtsw_wind_1m.json` and `json/rtsw/rtsw_mag_1m.json`.
 */

import { fetchSwpc } from '@/lib/services/swpc-proxy'
import type { FetchWithTimeoutOptions } from '@/lib/fetch-with-timeout'

export const RTSW_WIND_URL = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json'
export const RTSW_MAG_URL = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json'

export type RtswFeedPair = {
  windJson: unknown | null
  magJson: unknown | null
  windOk: boolean
  magOk: boolean
}

/** Shared RTSW wind+mag fetch used by solar-wind and plasma routes. */
export async function fetchRtswFeeds(
  options: FetchWithTimeoutOptions = {},
): Promise<RtswFeedPair> {
  const [plasmaResponse, magResponse] = await Promise.allSettled([
    fetchSwpc(RTSW_WIND_URL, options),
    fetchSwpc(RTSW_MAG_URL, options),
  ])

  let windJson: unknown | null = null
  let magJson: unknown | null = null
  let windOk = false
  let magOk = false

  if (plasmaResponse.status === 'fulfilled' && plasmaResponse.value.ok) {
    windOk = true
    windJson = await plasmaResponse.value.json()
  }
  if (magResponse.status === 'fulfilled' && magResponse.value.ok) {
    magOk = true
    magJson = await magResponse.value.json()
  }

  return { windJson, magJson, windOk, magOk }
}

export type SolarWindCurrent = {
  speed: number;
  density: number;
  temperature: number;
  /** Null when RTSW mag feed has no usable sample (do not invent quiet 0). */
  bz: number | null;
  bt: number | null;
};

export type SolarWindRecentPoint = {
  timeTag: string;
  speed: number;
  density: number;
  bz: number;
};

type WindRow = {
  time_tag?: string;
  active?: boolean;
  proton_speed?: number | null;
  proton_density?: number | null;
  proton_temperature?: number | null;
};

type MagRow = {
  time_tag?: string;
  active?: boolean;
  bz_gsm?: number | null;
  bt?: number | null;
};

function asWindRows(payload: unknown): WindRow[] {
  return Array.isArray(payload) ? (payload as WindRow[]) : [];
}

function asMagRows(payload: unknown): MagRow[] {
  return Array.isArray(payload) ? (payload as MagRow[]) : [];
}

function hasSpeed(row: WindRow): boolean {
  return typeof row.proton_speed === 'number' && row.proton_speed > 0;
}

/** Epoch ms for an RTSW time tag, which omits the zone but means UTC. */
function rowTimeMs(row: { time_tag?: string }): number {
  const raw = typeof row.time_tag === 'string' ? row.time_tag.trim() : '';
  if (!raw) return Number.NaN;
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);
  const withT = raw.includes('T') ? raw : raw.replace(' ', 'T');
  return Date.parse(hasZone ? withT : `${withT}Z`);
}

/**
 * The newest row satisfying `usable`, chosen by time tag rather than array
 * position.
 *
 * These feeds are served newest-first, so walking from the end of the array
 * returned the *oldest* sample in the 24-hour window: the hub and the
 * solar-wind and plasma API routes were reporting yesterday's solar wind as
 * current. Reading the time tag is correct whichever way SWPC orders the feed.
 */
function newestBy<T extends { time_tag?: string }>(
  rows: T[],
  usable: (row: T) => boolean,
): T | null {
  let best: T | null = null;
  let bestMs = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    if (!usable(row)) continue;
    const ms = rowTimeMs(row);
    // A row with an unreadable tag still beats having nothing at all.
    const rank = Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
    if (best === null || rank > bestMs) {
      best = row;
      bestMs = rank;
    }
  }
  return best;
}

/**
 * Rows oldest-first. Rows with an unreadable time tag keep their relative
 * order at the front, so they can never be taken for the newest sample.
 */
function oldestFirst<T extends { time_tag?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aMs = rowTimeMs(a);
    const bMs = rowTimeMs(b);
    if (!Number.isFinite(aMs) && !Number.isFinite(bMs)) return 0;
    if (!Number.isFinite(aMs)) return -1;
    if (!Number.isFinite(bMs)) return 1;
    return aMs - bMs;
  });
}

/** Prefer active RTSW samples; fall back to any positive speed. */
export function pickLatestWind(rows: WindRow[]): WindRow | null {
  return (
    newestBy(rows, (row) => Boolean(row.active) && hasSpeed(row)) ??
    newestBy(rows, hasSpeed)
  );
}

export function pickLatestMag(rows: MagRow[]): MagRow | null {
  const hasField = (row: MagRow) =>
    typeof row.bz_gsm === 'number' && typeof row.bt === 'number';
  return (
    newestBy(rows, (row) => Boolean(row.active) && hasField(row)) ??
    newestBy(rows, hasField)
  );
}

export function determineSpeedTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid);
  const second = values.slice(mid);
  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
  const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;
  const diff = avgSecond - avgFirst;
  const threshold = Math.abs(avgFirst) * 0.1;
  if (diff > threshold) return 'increasing';
  if (diff < -threshold) return 'decreasing';
  return 'stable';
}

export function parseRtswSolarWind(
  windPayload: unknown,
  magPayload: unknown,
): {
  current: SolarWindCurrent;
  recent: SolarWindRecentPoint[];
  trend: 'increasing' | 'decreasing' | 'stable';
  available: boolean;
} {
  // Chronological order once, here, so everything below can rely on it. SWPC
  // serves RTSW newest-first, and the `recent` series and its trend both read
  // the tail of the array as the most recent samples: unsorted, the chart drew
  // the oldest 360 samples and the trend arrow pointed the wrong way.
  const windRows = oldestFirst(asWindRows(windPayload));
  const magRows = oldestFirst(asMagRows(magPayload));
  const latestWind = pickLatestWind(windRows);
  const latestMag = pickLatestMag(magRows);

  if (!latestWind) {
    return {
      current: { speed: 0, density: 0, temperature: 0, bz: null, bt: null },
      recent: [],
      trend: 'stable',
      available: false,
    };
  }

  const withSpeed = windRows.filter(hasSpeed);
  const last360 = withSpeed.slice(-360);
  const speedValues: number[] = [];
  const recent: SolarWindRecentPoint[] = [];

  // Align sampling so the newest row is always included (indices …, n-31, n-1).
  const start = last360.length === 0 ? 0 : (last360.length - 1) % 30;
  for (let i = start; i < last360.length; i += 30) {
    const row = last360[i]!;
    const speed = row.proton_speed ?? 0;
    speedValues.push(speed);
    recent.push({
      timeTag: String(row.time_tag ?? ''),
      speed,
      density: row.proton_density ?? 0,
      bz: 0,
    });
  }

  // Attach nearest mag Bz samples to recent points
  if (magRows.length > 0 && recent.length > 0) {
    const magWithBz = magRows.filter((r) => typeof r.bz_gsm === 'number');
    for (const point of recent) {
      const t = Date.parse(point.timeTag);
      if (Number.isNaN(t)) continue;
      let best: MagRow | null = null;
      let bestDelta = Infinity;
      for (const m of magWithBz.slice(-400)) {
        const mt = Date.parse(String(m.time_tag ?? ''));
        if (Number.isNaN(mt)) continue;
        const delta = Math.abs(mt - t);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = m;
        }
      }
      if (best && bestDelta < 15 * 60 * 1000) {
        point.bz = Math.round((best.bz_gsm as number) * 10) / 10;
      }
    }
  }

  const magFresh =
    latestMag &&
    (typeof latestMag.bz_gsm === 'number' || typeof latestMag.bt === 'number');

  return {
    current: {
      speed: Math.round(latestWind.proton_speed ?? 0),
      density: Math.round((latestWind.proton_density ?? 0) * 10) / 10,
      temperature: Math.round(latestWind.proton_temperature ?? 0),
      bz:
        magFresh && typeof latestMag?.bz_gsm === 'number'
          ? Math.round(latestMag.bz_gsm * 10) / 10
          : null,
      bt:
        magFresh && typeof latestMag?.bt === 'number'
          ? Math.round(latestMag.bt * 10) / 10
          : null,
    },
    recent: recent.slice(-12),
    trend: determineSpeedTrend(speedValues),
    available: true,
  };
}

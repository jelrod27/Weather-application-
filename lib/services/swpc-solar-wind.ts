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

/** Prefer active RTSW samples; fall back to any positive speed. */
export function pickLatestWind(rows: WindRow[]): WindRow | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i]!;
    if (row.active && hasSpeed(row)) return row;
  }
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i]!;
    if (hasSpeed(row)) return row;
  }
  return null;
}

export function pickLatestMag(rows: MagRow[]): MagRow | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i]!;
    if (row.active && typeof row.bz_gsm === 'number' && typeof row.bt === 'number') {
      return row;
    }
  }
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i]!;
    if (typeof row.bz_gsm === 'number' && typeof row.bt === 'number') return row;
  }
  return null;
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
  const windRows = asWindRows(windPayload);
  const magRows = asMagRows(magPayload);
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

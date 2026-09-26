/**
 * Travel Corridor Service
 *
 * Scores weather conditions along US interstate corridors using Open-Meteo data.
 */

import { openMeteoLocalTimeToEpoch } from '@/lib/pollen/open-meteo-pollen';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export interface WeatherConditions {
  precipitation: number;
  snowfall: number;
  windGusts: number;
  visibility: number;
  freezingLevel: number;
}

export const DEFAULT_WEATHER_CONDITIONS: WeatherConditions = {
  precipitation: 0,
  snowfall: 0,
  windGusts: 0,
  visibility: 10000,
  freezingLevel: 3000,
};

function sanitize(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

/**
 * Score weather severity on a 0-100 scale.
 * 0 = clear, 25 = caution, 50 = hazardous, 75+ = dangerous
 */
export function scoreWeatherSeverity(conditions: WeatherConditions): number {
  const precipitation = sanitize(conditions.precipitation, 0);
  const snowfall = sanitize(conditions.snowfall, 0);
  const windGusts = sanitize(conditions.windGusts, 0);
  const visibility = Number.isFinite(conditions.visibility) ? Math.max(0, conditions.visibility) : 10000;

  let score = 0;

  if (precipitation > 0) score += Math.min(25, precipitation * 5);
  if (snowfall > 0) score += Math.min(30, snowfall * 15);
  if (windGusts > 40) score += Math.min(20, (windGusts - 40) * 0.5);
  if (visibility < 5000) score += Math.min(25, ((5000 - visibility) / 5000) * 25);

  return Number.isFinite(score) ? Math.min(100, Math.round(score)) : 0;
}

export type SeverityLevel = 'green' | 'yellow' | 'orange' | 'red';

export function getSeverityLevel(score: number): SeverityLevel {
  if (score >= 75) return 'red';
  if (score >= 50) return 'orange';
  if (score >= 25) return 'yellow';
  return 'green';
}

export const SEVERITY_COLORS: Record<SeverityLevel | 'unknown', string> = {
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  unknown: '#6b7280',
};

export interface WaypointWeather extends WeatherConditions {
  sampledAt: string | null;
  timeZone: string | null;
}
export type CorridorLevel = SeverityLevel | 'unknown';
export const CORRIDOR_LEVEL_LABEL: Record<CorridorLevel, string> = {
  green: 'LOW IMPACT', yellow: 'CAUTION', orange: 'HAZARDOUS', red: 'DANGEROUS', unknown: 'INCOMPLETE',
};

export interface CorridorSegment {
  lat: number;
  lon: number;
  score: number;
  level: CorridorLevel;
  color: string;
}

export interface CorridorResult {
  name: string;
  score: number;
  level: CorridorLevel;
  color: string;
  hazard: string;
  segments: CorridorSegment[];
  coverage: { available: number; total: number };
  worstPoint: (CorridorSegment & { hazard: string; sampledAt: string | null; timeZone: string | null }) | null;
}

/** Severity is the highest sampled risk; average and sample coverage remain separate. */
export function summarizeCorridor(name: string, waypoints: number[][], samples: Array<WaypointWeather | null>): CorridorResult {
  const points = waypoints.map((wp, index) => {
    const sample = samples[index];
    if (!sample) return null;
    const score = scoreWeatherSeverity(sample);
    const hazard = getHazardDescription(sample);
    const numericalLevel = getSeverityLevel(score);
    const level: CorridorLevel = numericalLevel === 'green' && hazard !== 'Clear' ? 'yellow' : numericalLevel;
    return { lat: wp[0], lon: wp[1], score, level, color: SEVERITY_COLORS[level], hazard, sampledAt: sample.sampledAt, timeZone: sample.timeZone };
  });
  const available = points.filter(point => point !== null);
  const worstPoint = [...available].sort((a, b) => levelRank(b.level) - levelRank(a.level) || b.score - a.score)[0] ?? null;
  const incomplete = available.length < waypoints.length;
  const level = !worstPoint || incomplete && worstPoint.level === 'green' ? 'unknown' : worstPoint.level;
  return {
    name, score: available.length ? Math.round(available.reduce((sum, point) => sum + point.score, 0) / available.length) : -1,
    level, color: SEVERITY_COLORS[level], hazard: worstPoint?.hazard ?? 'Data unavailable',
    segments: points.map((point, index) => point ?? { lat: waypoints[index][0], lon: waypoints[index][1], score: -1, level: 'unknown', color: SEVERITY_COLORS.unknown }),
    coverage: { available: available.length, total: waypoints.length }, worstPoint,
  };
}

function levelRank(level: CorridorLevel): number {
  return { green: 0, unknown: 1, yellow: 2, orange: 3, red: 4 }[level];
}

export function formatCorridorSample(point: NonNullable<CorridorResult['worstPoint']>): string {
  const location = `Sample at ${point.lat.toFixed(2)}, ${point.lon.toFixed(2)}`;
  if (!point.sampledAt || !point.timeZone) return `${location} · Sample time unavailable`;
  const time = new Date(point.sampledAt);
  if (!Number.isFinite(time.getTime())) return `${location} · Sample time unavailable`;
  return `${location} · ${time.toLocaleString('en-US', { timeZone: point.timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`;
}

export function getWorstCorridors(corridors: CorridorResult[], limit: number): CorridorResult[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  return [...corridors]
    .sort((a, b) => levelRank(b.level) - levelRank(a.level) || (b.worstPoint?.score ?? -1) - (a.worstPoint?.score ?? -1))
    .slice(0, safeLimit);
}

export function getHazardDescription(conditions: WeatherConditions): string {
  if (conditions.snowfall > 1) return 'Heavy snow';
  if (conditions.snowfall > 0) return 'Snow';
  if (conditions.visibility < 1000) return 'Dense fog';
  if (conditions.visibility < 3000) return 'Low visibility';
  if (conditions.precipitation > 5) return 'Heavy rain';
  if (conditions.precipitation > 0.5) return 'Rain';
  if (conditions.windGusts > 80) return 'Dangerous winds';
  if (conditions.windGusts > 50) return 'High winds';
  return 'Clear';
}

function localNoonIndex(times: unknown, timeZone: unknown, offset: unknown, forecastDay: number): number {
  if (!Array.isArray(times) || typeof timeZone !== 'string' || typeof offset !== 'number') return -1;
  try {
    const calendar = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const today = calendar.format(Date.now());
    const targetDate = new Date(`${today}T12:00:00Z`);
    targetDate.setUTCDate(targetDate.getUTCDate() + forecastDay);
    const day = targetDate.toISOString().slice(0, 10);
    const hour = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' });
    return times.findIndex(time => {
      if (typeof time !== 'string') return false;
      const epoch = openMeteoLocalTimeToEpoch(time, offset);
      return Number.isFinite(epoch) && calendar.format(epoch) === day && hour.format(epoch) === '12';
    });
  } catch { return -1; }
}

const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';
const WAYPOINT_FETCH_TIMEOUT_MS = 15_000;

/**
 * Batched Open-Meteo fetch for an array of `[lat, lon]` waypoints. Returns one
 * WeatherConditions per waypoint. `forecastDay === 0` reads current conditions;
 * otherwise it samples the midday hour of that forecast day. Shared by
 * /api/travel/corridors and /api/travel/trip-score so the request shape and
 * forecast-day handling stay identical across the travel feature.
 *
 * The fetch is bounded by an internal 15s timeout and also aborts if the
 * caller's `requestSignal` aborts (client disconnect).
 */
export async function fetchWeatherForWaypoints(
  waypoints: number[][],
  forecastDay: number,
  options: { userAgent?: string; requestSignal?: AbortSignal } = {},
): Promise<Array<WaypointWeather | null>> {
  if (waypoints.length === 0) return [];

  const lats = waypoints.map((w) => w[0]).join(',');
  const lons = waypoints.map((w) => w[1]).join(',');

  const url = new URL(OPEN_METEO_FORECAST);
  url.searchParams.set('latitude', lats);
  url.searchParams.set('longitude', lons);

  if (forecastDay === 0) {
    url.searchParams.set('current', 'precipitation,snowfall,wind_gusts_10m,visibility');
  } else {
    url.searchParams.set('hourly', 'precipitation,snowfall,wind_gusts_10m,visibility');
    url.searchParams.set('forecast_days', String(forecastDay + 1));
  }
  url.searchParams.set('timezone', 'auto');

  const response = await fetchWithTimeout(url.toString(), {
    timeoutMs: WAYPOINT_FETCH_TIMEOUT_MS,
    signal: options.requestSignal,
    headers: { 'User-Agent': options.userAgent ?? '16-Bit-Weather/travel' },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed: ${response.status}`);
  }

  const data = await response.json();
  const locations = Array.isArray(data) ? data : [data];

  return waypoints.map((_, index): WaypointWeather | null => {
    const loc = locations[index];
    if (!loc || typeof loc !== 'object') return null;
    const source = forecastDay === 0 ? loc.current : loc.hourly;
    if (!source) return null;
    // Provider ISO labels use one fixed UTC offset. Never reinterpret them through IANA DST.
    const hourIndex = forecastDay === 0 ? 0 : localNoonIndex(source.time, loc.timezone, loc.utc_offset_seconds, forecastDay);
    if (hourIndex < 0) return null;
    const read = (field: string): unknown => forecastDay === 0 ? source[field] : source[field]?.[hourIndex];
    const precipitation = read('precipitation');
    const snowfall = read('snowfall');
    const windGusts = read('wind_gusts_10m');
    const visibility = read('visibility');
    if (typeof precipitation !== 'number' || !Number.isFinite(precipitation) || precipitation < 0 ||
        typeof snowfall !== 'number' || !Number.isFinite(snowfall) || snowfall < 0 ||
        typeof windGusts !== 'number' || !Number.isFinite(windGusts) || windGusts < 0 ||
        typeof visibility !== 'number' || !Number.isFinite(visibility) || visibility < 0) return null;
    const time = read('time');
    const epoch = typeof time === 'string' && typeof loc.utc_offset_seconds === 'number'
      ? openMeteoLocalTimeToEpoch(time, loc.utc_offset_seconds) : Number.NaN;
    return { precipitation, snowfall, windGusts, visibility, freezingLevel: 3000,
      sampledAt: Number.isFinite(epoch) ? new Date(epoch).toISOString() : null,
      timeZone: typeof loc.timezone === 'string' ? loc.timezone : null };
  });
}

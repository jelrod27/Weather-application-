/**
 * Travel Corridor Service
 *
 * Scores weather conditions along US interstate corridors using Open-Meteo data.
 */

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

export interface CorridorSegment {
  lat: number;
  lon: number;
  score: number;
  level: SeverityLevel;
  color: string;
}

export interface CorridorResult {
  name: string;
  score: number;
  level: SeverityLevel;
  color: string;
  hazard: string;
  segments: CorridorSegment[];
}

export function getWorstCorridors(corridors: CorridorResult[], limit: number): CorridorResult[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  return [...corridors]
    .filter(c => c.hazard !== 'Data unavailable')
    .sort((a, b) => b.score - a.score)
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
): Promise<WeatherConditions[]> {
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

  return locations.map((loc: Record<string, unknown>) => {
    const current = loc.current as Record<string, number> | undefined;
    if (forecastDay === 0 && current) {
      return {
        precipitation: current.precipitation ?? 0,
        snowfall: current.snowfall ?? 0,
        windGusts: current.wind_gusts_10m ?? 0,
        visibility: current.visibility ?? 10000,
        freezingLevel: 3000,
      };
    }

    const hourly = loc.hourly as Record<string, number[]> | undefined;
    if (hourly) {
      const targetHour = forecastDay * 24 + 12;
      const idx = Math.min(targetHour, (hourly.precipitation?.length ?? 1) - 1);
      return {
        precipitation: hourly.precipitation?.[idx] ?? 0,
        snowfall: hourly.snowfall?.[idx] ?? 0,
        windGusts: hourly.wind_gusts_10m?.[idx] ?? 0,
        visibility: hourly.visibility?.[idx] ?? 10000,
        freezingLevel: 3000,
      };
    }

    return { ...DEFAULT_WEATHER_CONDITIONS };
  });
}

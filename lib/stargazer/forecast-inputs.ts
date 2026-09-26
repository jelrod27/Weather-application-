import { isStargazerTimeZone } from '@/lib/stargazer/context';
import { WMO_CODES } from '@/lib/wmo-codes';
import type { HourlyCondition } from '@/lib/stargazer/types';

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** Validate provider fields without coercing missing observations to zero. Values remain metric. */
export function readStargazerWeather(body: unknown): { hours: HourlyCondition[]; timeZone?: string } {
  const response = record(body);
  const hourly = record(response.hourly);
  const units = record(response.hourly_units);
  const timeZone = typeof response.timezone === 'string' && isStargazerTimeZone(response.timezone) ? response.timezone : undefined;
  const times = Array.isArray(hourly.time) ? hourly.time : [];
  const offset = response.utc_offset_seconds;
  const stamps = times.map((raw: unknown): number => {
    if (typeof raw === 'number') return new Date(raw * 1000).getTime();
    if (typeof raw !== 'string') return NaN;
    if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) return Date.parse(raw);
    // Legacy ISO labels use one fixed response offset, even across DST.
    if (typeof offset !== 'number' || !Number.isFinite(offset) || Math.abs(offset) > 86400) return NaN;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return NaN;
    const parsed = new Date(raw + ':00.000Z');
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== raw + ':00.000Z') return NaN;
    return parsed.getTime() - offset * 1000;
  });
  const finiteStamps = stamps.filter(Number.isFinite);
  if (finiteStamps.some((stamp, index) => index > 0 && stamp < finiteStamps[index - 1])) return { hours: [], timeZone };
  const counts = new Map<number, number>();
  finiteStamps.forEach(stamp => counts.set(stamp, (counts.get(stamp) ?? 0) + 1));
  const hours: HourlyCondition[] = [];
  stamps.forEach((stamp, index) => {
    if (!Number.isFinite(stamp) || counts.get(stamp) !== 1) return;
    const value = (key: string, unit: string, min = -Infinity, max = Infinity): number | null => {
      const values = hourly[key];
      const entry: unknown = Array.isArray(values) ? values[index] : null;
      return units[key] === unit && typeof entry === 'number' && Number.isFinite(entry) && entry >= min && entry <= max ? entry : null;
    };
    const temperature = value('temperature_2m', '°C');
    const dewpoint = value('dewpoint_2m', '°C');
    const weatherCode = value('weather_code', 'wmo code');
    hours.push({
      time: new Date(stamp), cloudCover: value('cloud_cover', '%', 0, 100),
      cloudCoverLow: value('cloud_cover_low', '%', 0, 100), cloudCoverMid: value('cloud_cover_mid', '%', 0, 100),
      cloudCoverHigh: value('cloud_cover_high', '%', 0, 100), humidity: value('relative_humidity_2m', '%', 0, 100),
      temperature, dewpoint, windSpeed: value('wind_speed_10m', 'km/h', 0),
      precipitationProbability: value('precipitation_probability', '%', 0, 100),
      weatherCode: weatherCode !== null && Object.hasOwn(WMO_CODES, weatherCode) ? weatherCode : null,
      seeing: null, transparency: null,
      dewRisk: temperature === null || dewpoint === null ? null : temperature - dewpoint < 2 ? 'high' : temperature - dewpoint < 5 ? 'moderate' : 'low',
    });
  });
  return { hours, timeZone };
}

/** HTTP Date reflects this provider response, not the underlying model run. */
export function readWeatherRetrievedAt(response: Response, now: Date): string | null {
  const stamp = Date.parse(response.headers?.get('date') ?? '');
  return Number.isFinite(stamp) && stamp <= now.getTime() ? new Date(stamp).toISOString() : null;
}

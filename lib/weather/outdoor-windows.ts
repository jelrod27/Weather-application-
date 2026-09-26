import { WMO_CODES } from '@/lib/wmo-codes';
import type { EnhancedHourlyForecast, WeatherData } from '@/lib/types';

const HOUR = 3600;
const OMITTED_CODES = new Set([48, 56, 57, 65, 66, 67, 75, 82, 86, 95, 96, 99]);

export type OutdoorDay = 'today' | 'tomorrow';
export type OutdoorDuration = 1 | 2;
export type WindowPriority = 'precipitation' | 'wind' | 'temperature';

export interface OutdoorWindow {
  start: number;
  end: number;
  priority: WindowPriority;
  temperature: { low: number; high: number };
  precipitationHigh: number;
  windHigh: number;
}

export type OutdoorPlan =
  | { status: 'unavailable'; reason: 'timezone' | 'units' | 'forecast' }
  | { status: 'ready'; date: string; windows: OutdoorWindow[]; excludedHazards: boolean };

interface OutdoorPlanOptions {
  now: number;
  day: OutdoorDay;
  duration: OutdoorDuration;
}

interface CompleteReading extends EnhancedHourlyForecast {
  temp: number;
  windSpeed: number;
  weatherCode: number;
}

function isCompleteReading(hour: EnhancedHourlyForecast | null | undefined): hour is CompleteReading {
  return Boolean(hour && typeof hour.temp === 'number' && Number.isFinite(hour.temp) &&
    typeof hour.windSpeed === 'number' && Number.isFinite(hour.windSpeed) && hour.windSpeed >= 0 &&
    typeof hour.weatherCode === 'number' && Object.hasOwn(WMO_CODES, hour.weatherCode));
}

/**
 * Compare complete future outings using existing hourly forecasts, without a synthetic safety score.
 * Temperature/wind include both endpoints; precipitation at each ending timestamp covers the preceding
 * hour (https://open-meteo.com/en/docs#hourly-parameter-definition). Max hourly probability is not the
 * probability of precipitation over the whole outing. Clock hours 06:00–21:00 are not a daylight estimate.
 */
export function getOutdoorPlan(
  weather: Pick<WeatherData, 'hourlyForecast' | 'unit' | 'timezone'>,
  { now, day, duration }: OutdoorPlanOptions,
): OutdoorPlan {
  if (!Number.isFinite(now) || !Number.isFinite(new Date(now).getTime()) || (duration !== 1 && duration !== 2)) {
    return { status: 'unavailable', reason: 'forecast' };
  }
  if (weather.unit !== '°C' && weather.unit !== '°F') return { status: 'unavailable', reason: 'units' };
  let clock: Intl.DateTimeFormat;
  try {
    if (!weather.timezone) return { status: 'unavailable', reason: 'timezone' };
    clock = new Intl.DateTimeFormat('en-US', {
      timeZone: weather.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
  } catch { return { status: 'unavailable', reason: 'timezone' }; }
  const local = (seconds: number): { date: string; minute: number } => {
    const parts = Object.fromEntries(clock.formatToParts(seconds * 1000).map(part => [part.type, part.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  };
  const seconds = now / 1000;
  const target = new Date(`${local(seconds).date}T12:00:00Z`);
  // Increment a calendar date, not the current instant: tomorrow can be 23 or 25 hours away.
  if (day === 'tomorrow') target.setUTCDate(target.getUTCDate() + 1);
  const date = target.toISOString().slice(0, 10);
  const readings = new Map<number, EnhancedHourlyForecast | null>();
  for (const hour of weather.hourlyForecast ?? []) {
    if (!Number.isFinite(hour.dt) || hour.dt < seconds - HOUR || hour.dt > seconds + 48 * HOUR) continue;
    // Ambiguous duplicate timestamps cannot safely contribute to a comparison.
    readings.set(hour.dt, readings.has(hour.dt) ? null : hour);
  }
  if (![...readings.keys()].some(dt => Math.abs(dt - seconds) <= HOUR)) {
    return { status: 'unavailable', reason: 'forecast' };
  }

  const candidates: OutdoorWindow[] = [];
  let excludedHazards = false;
  for (const start of readings.keys()) {
    if (start < seconds) continue;
    const end = start + duration * HOUR;
    const from = local(start);
    const to = local(end);
    if (from.date !== date || to.date !== date || from.minute < 6 * 60 || to.minute > 21 * 60) continue;
    const samples = Array.from({ length: duration + 1 }, (_, index) => readings.get(start + index * HOUR));
    if (!samples.every(isCompleteReading)) continue;
    const chances = samples.slice(1).map(hour => hour.precipChance);
    if (!chances.every((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100)) continue;
    if (samples.some(hour => OMITTED_CODES.has(hour.weatherCode))) { excludedHazards = true; continue; }
    const temperatures = samples.map(hour => hour.temp);
    candidates.push({
      start, end, priority: 'precipitation',
      temperature: { low: Math.min(...temperatures), high: Math.max(...temperatures) },
      precipitationHigh: Math.max(...chances), windHigh: Math.max(...samples.map(hour => hour.windSpeed)),
    });
  }

  const celsius = (temperature: number): number => weather.unit === '°C' ? temperature : (temperature - 32) / 1.8;
  const mildness = (window: OutdoorWindow): number => Math.max(
    Math.abs(celsius(window.temperature.low) - 20), Math.abs(celsius(window.temperature.high) - 20),
  );
  const windows: OutdoorWindow[] = [];
  const priorities: WindowPriority[] = ['precipitation', 'wind', 'temperature'];
  for (const priority of priorities) {
    const value = (window: OutdoorWindow): number => priority === 'precipitation' ? window.precipitationHigh
      : priority === 'wind' ? window.windHigh : mildness(window);
    const available = candidates.filter(candidate => windows.every(chosen => candidate.start >= chosen.end || candidate.end <= chosen.start));
    available.sort((a, b) => value(a) - value(b) || a.start - b.start);
    if (available[0]) windows.push({ ...available[0], priority });
  }
  return { status: 'ready', date, windows, excludedHazards };
}

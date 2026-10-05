import type { OpenMeteoForecastResponse } from '@/lib/open-meteo-types';

export const NBM_HOURLY_TEMPERATURES = ['temperature_2m', 'apparent_temperature'] as const;
export const NBM_DAILY_TEMPERATURES = [
  'temperature_2m_max', 'temperature_2m_min',
  'apparent_temperature_max', 'apparent_temperature_min',
] as const;

function matchingTimes(base: string[], candidate: string[]): boolean {
  return Array.isArray(base) && Array.isArray(candidate) && base.length > 0 && base.length === candidate.length &&
    base.every((time, index) => time === candidate[index]);
}

function completeNumbers(values: unknown, length: number): values is number[] {
  return Array.isArray(values) && values.length === length &&
    values.every(value => typeof value === 'number' && Number.isFinite(value));
}

/** Replace the whole forecast temperature group or none of it. Current weather
 * and ancillary metrics retain Best Match; missing NBM UV/pressure never leak in.
 */
export function applyNbmForecastTemperatures(
  base: OpenMeteoForecastResponse,
  nbm: OpenMeteoForecastResponse | null,
): OpenMeteoForecastResponse {
  const hourly = nbm?.hourly;
  const daily = nbm?.daily;
  if (!hourly || !daily || !base.hourly || !base.daily ||
      nbm?.timezone !== base.timezone || nbm?.utc_offset_seconds !== base.utc_offset_seconds ||
      !matchingTimes(base.hourly.time, hourly.time) || !matchingTimes(base.daily.time, daily.time)) {
    return base;
  }
  const hourlyCount = base.hourly.time.length;
  const dailyCount = base.daily.time.length;

  const hourlyComplete = NBM_HOURLY_TEMPERATURES.every(key =>
    base.hourly_units?.[key] && base.hourly_units[key] === nbm.hourly_units?.[key] &&
    completeNumbers(hourly[key], hourlyCount));
  const dailyComplete = NBM_DAILY_TEMPERATURES.every(key =>
    base.daily_units?.[key] && base.daily_units[key] === nbm.daily_units?.[key] &&
    completeNumbers(daily[key], dailyCount));
  if (!hourlyComplete || !dailyComplete) return base;

  return {
    ...base,
    hourly: {
      ...base.hourly,
      temperature_2m: hourly.temperature_2m,
      apparent_temperature: hourly.apparent_temperature,
    },
    daily: {
      ...base.daily,
      temperature_2m_max: daily.temperature_2m_max,
      temperature_2m_min: daily.temperature_2m_min,
      apparent_temperature_max: daily.apparent_temperature_max,
      apparent_temperature_min: daily.apparent_temperature_min,
    },
  };
}

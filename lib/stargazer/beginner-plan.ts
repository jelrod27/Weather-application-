import { getHourTargets } from '@/lib/stargazer/beginner-geometry';
import { isStargazerTimeZone } from '@/lib/stargazer/context';
import { OUTDOOR_EXCLUDED_WEATHER_CODES } from '@/lib/weather/outdoor-windows';
import type { BeginnerNight, ObservingHour, ObservingWeatherIssue } from '@/lib/stargazer/beginner-types';
import type { DarkWindow, HourlyCondition, StargazerData } from '@/lib/stargazer/types';

function weatherForHour(start: HourlyCondition, end: HourlyCondition): ObservingHour['weather'] {
  const range = (a: number | null, b: number | null): [number | null, number | null] =>
    a == null || b == null ? [null, null] : [Math.min(a, b), Math.max(a, b)];
  const [cloudLow, cloudHigh] = range(start.cloudCover, end.cloudCover);
  const [temperatureLow, temperatureHigh] = range(start.temperature, end.temperature);
  const [, wind] = range(start.windSpeed, end.windSpeed);
  // Open-Meteo probability at the ending timestamp describes the preceding hour.
  const precipitation = end.precipitationProbability;
  const issues: ObservingWeatherIssue[] = [];
  if ([cloudLow, temperatureLow, wind, precipitation, start.weatherCode, end.weatherCode].some(value => value == null)) issues.push('missing');
  if (cloudHigh !== null && cloudHigh >= 75) issues.push('clouds');
  if (precipitation !== null && precipitation >= 50) issues.push('precipitation');
  if ([start.weatherCode, end.weatherCode].some(code => code !== null && OUTDOOR_EXCLUDED_WEATHER_CODES.has(code))) issues.push('weather-code');
  return { cloudLow, cloudHigh, temperatureLow, temperatureHigh, wind, precipitation, issues };
}

/** Construct future one-hour choices from contiguous, validated weather samples in this observing night. */
export function buildBeginnerNight(hours: HourlyCondition[], location: StargazerData['location'], darkWindow: DarkWindow, now: number): BeginnerNight {
  if (!isStargazerTimeZone(location.timezone)) return { hours: [], reason: 'timezone' };
  const start = darkWindow.sunset?.getTime() ?? darkWindow.astronomicalDusk.getTime();
  const end = darkWindow.sunrise?.getTime() ?? (darkWindow.status === 'none' ? now + 86400000 : darkWindow.astronomicalDawn.getTime());
  const choices: ObservingHour[] = [];
  for (let index = 0; index < hours.length - 1; index++) {
    const first = hours[index];
    const last = hours[index + 1];
    const stamp = first.time.getTime();
    const endStamp = last.time.getTime();
    if (stamp < now || stamp < start || endStamp > end || endStamp - stamp !== 3600000) continue;
    choices.push({ start: stamp, end: endStamp, midpoint: stamp + 1800000,
      weather: weatherForHour(first, last), targets: getHourTargets(location.lat, location.lon, stamp) });
  }
  return { hours: choices, ...(!choices.length ? { reason: 'coverage' as const } : {}) };
}

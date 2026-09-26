import { getOutdoorPlan } from '@/lib/weather/outdoor-windows';
import type { EnhancedHourlyForecast, WeatherData } from '@/lib/types';

const NOW = Date.parse('2026-09-26T08:15:00Z');
const HOUR = 3600;
const START = Date.parse('2026-09-26T08:00:00Z') / 1000;
const hour = (offset: number, changes: Partial<EnhancedHourlyForecast> = {}): EnhancedHourlyForecast => ({
  dt: START + offset * HOUR, time: 'ignored label', temp: 20, precipChance: 10,
  windSpeed: 8, weatherCode: 2, condition: 'Clouds', description: 'partly cloudy', ...changes,
});
const weather = (hours: EnhancedHourlyForecast[]): Pick<WeatherData, 'hourlyForecast' | 'unit' | 'timezone'> => ({
  hourlyForecast: hours, unit: '°C', timezone: 'UTC',
});
const settings = { now: NOW, day: 'today' as const, duration: 2 as const };

describe('outdoor window comparisons', () => {
  it('covers the full outing, using precipitation for the hours ending inside it', () => {
    const result = getOutdoorPlan(weather([
      hour(0), hour(1, { precipChance: 90, temp: 16 }),
      hour(2, { precipChance: 20, windSpeed: 12 }), hour(3, { precipChance: 30, temp: 22 }),
    ]), settings);
    expect(result).toMatchObject({ status: 'ready', windows: [{
      start: hour(1).dt, end: hour(3).dt, precipitationHigh: 30,
      temperature: { low: 16, high: 22 }, windHigh: 12,
    }] });
  });

  it('compares lower precipitation, lighter wind and milder readings in distinct periods', () => {
    const hours = Array.from({ length: 11 }, (_, i) => hour(i, {
      precipChance: i <= 3 ? 5 : 25,
      windSpeed: i >= 4 && i <= 6 ? 2 : 10,
      temp: i >= 7 ? 20 : 10,
    }));
    const result = getOutdoorPlan(weather(hours), settings);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.windows.map(w => w.priority)).toEqual(['precipitation', 'wind', 'temperature']);
    expect(result.windows.map(w => w.start)).toEqual([hour(1).dt, hour(4).dt, hour(7).dt]);
    for (const [index, window] of result.windows.entries()) {
      expect(result.windows.slice(index + 1).every(other => other.start >= window.end || other.end <= window.start)).toBe(true);
    }
  });

  it('does not bridge missing hours or choose already-started outings', () => {
    expect(getOutdoorPlan(weather([hour(0), hour(1), hour(3)]), settings)).toMatchObject({ windows: [] });
    expect(getOutdoorPlan(weather([hour(0), hour(1)]), { ...settings, duration: 1 })).toMatchObject({ windows: [] });
  });

  it('rejects missing and invalid readings but keeps genuine zeroes', () => {
    for (const invalid of [{ temp: null }, { temp: NaN }, { precipChance: null }, { precipChance: 101 },
      { windSpeed: undefined }, { windSpeed: -1 }, { weatherCode: null }, { weatherCode: 1000 }]) {
      expect(getOutdoorPlan(weather([hour(0), hour(1), hour(2, invalid)]), { ...settings, duration: 1 })).toMatchObject({ windows: [] });
    }
    expect(getOutdoorPlan(weather([hour(0), hour(1, { temp: 0, windSpeed: 0 }), hour(2, { temp: 0, windSpeed: 0, precipChance: 0 })]), { ...settings, duration: 1 })).toMatchObject({
      windows: [{ temperature: { low: 0, high: 0 }, windHigh: 0, precipitationHigh: 0 }],
    });
  });

  it('omits thunderstorms and freezing or heavy precipitation even with low probabilities', () => {
    for (const code of [48, 56, 57, 65, 66, 67, 75, 82, 86, 95, 96, 99]) {
      expect(getOutdoorPlan(weather([hour(0), hour(1), hour(2, { weatherCode: code, precipChance: 0 })]), { ...settings, duration: 1 })).toMatchObject({
        windows: [], excludedHazards: true,
      });
    }
  });

  it('rejects ambiguous duplicates and handles unsorted input without changing the input', () => {
    const hours = [hour(3), hour(0), hour(2), hour(1)];
    expect(getOutdoorPlan(weather(hours), settings)).toMatchObject({ windows: [{ start: hour(1).dt }] });
    expect(hours[0].dt).toBe(hour(3).dt);
    expect(getOutdoorPlan(weather([...hours, hour(2, { temp: 99 })]), settings)).toMatchObject({ windows: [] });
  });

  it('uses the city calendar around midnight and daylight-saving changes', () => {
    const tokyo = { ...weather([hour(0), hour(21), hour(22), hour(23)]), timezone: 'Asia/Tokyo' };
    expect(getOutdoorPlan(tokyo, { ...settings, day: 'tomorrow' })).toMatchObject({ date: '2026-09-27', windows: [{ start: hour(21).dt }] });
    expect(getOutdoorPlan(tokyo, settings)).toMatchObject({ date: '2026-09-26', windows: [] });
    const beforeDst = Date.parse('2026-10-31T04:15:00Z'); // 00:15 in New York
    const dstHours = Array.from({ length: 48 }, (_, i) => ({ ...hour(0), dt: beforeDst / 1000 - 900 + i * HOUR }));
    const result = getOutdoorPlan({ ...weather(dstHours), timezone: 'America/New_York' }, { ...settings, now: beforeDst, day: 'tomorrow' });
    expect(result).toMatchObject({ date: '2026-11-01' });
    if (result.status !== 'ready') throw new Error('Expected available DST-day windows');
    expect(result.windows[0].start).toBe(Date.parse('2026-11-01T11:00:00Z') / 1000);
  });

  it('keeps comparisons equivalent between Celsius/kmh and Fahrenheit/mph', () => {
    const hours = Array.from({ length: 12 }, (_, i) => hour(i, { temp: 10 + i, windSpeed: 8 + i }));
    const celsius = getOutdoorPlan(weather(hours), settings);
    const fahrenheit = getOutdoorPlan({ ...weather(hours.map(h => ({ ...h, temp: h.temp! * 1.8 + 32, windSpeed: h.windSpeed! / 1.609344 }))), unit: '°F' }, settings);
    expect(celsius.status).toBe('ready');
    expect(fahrenheit.status).toBe('ready');
    if (celsius.status !== 'ready' || fahrenheit.status !== 'ready') return;
    expect(fahrenheit.windows.map(w => w.start)).toEqual(celsius.windows.map(w => w.start));
    expect(fahrenheit.windows[0].temperature.low).toBe(celsius.windows[0].temperature.low * 1.8 + 32);
  });

  it('requires a known timezone, supported units, and readings near the current time', () => {
    expect(getOutdoorPlan({ ...weather([hour(0)]), timezone: 'Not/AZone' }, settings)).toMatchObject({ status: 'unavailable', reason: 'timezone' });
    expect(getOutdoorPlan({ ...weather([hour(0)]), unit: 'Kelvin' }, settings)).toMatchObject({ status: 'unavailable', reason: 'units' });
    expect(getOutdoorPlan(weather([hour(-25), hour(-24), hour(-23)]), settings)).toMatchObject({ status: 'unavailable', reason: 'forecast' });
  });
});

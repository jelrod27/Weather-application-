import { buildBeginnerNight } from '@/lib/stargazer/beginner-plan';
import { selectBeginnerHour, targetsForEquipment } from '@/lib/stargazer/beginner-selection';
import { getHourTargets } from '@/lib/stargazer/beginner-geometry';
import type { HourlyCondition } from '@/lib/stargazer/types';

jest.mock('@/lib/stargazer/beginner-geometry', () => ({ getHourTargets: jest.fn() }));
const start = Date.parse('2026-09-27T01:00:00Z');
const location = { lat: 40.7128, lon: -74.006, timezone: 'America/New_York' };
const darkWindow = { astronomicalDusk: new Date(start), astronomicalDawn: new Date(start + 5 * 3600000), sunset: new Date(start), sunrise: new Date(start + 5 * 3600000) };
const target = (id: string, minAltitude = 40, magnitude = 0) => ({ id, minAltitude, magnitude, altitude: minAltitude + 2, azimuth: 90 });
const hour = (offset: number, cloudCover = 10): HourlyCondition => ({ time: new Date(start + offset * 3600000), cloudCover, cloudCoverLow: null, cloudCoverMid: null, cloudCoverHigh: null, seeing: null, transparency: null, windSpeed: 10, humidity: 50, temperature: 15, dewpoint: null, dewRisk: null, precipitationProbability: 5, weatherCode: 0 });
beforeEach(() => jest.mocked(getHourTargets).mockReturnValue([target('Moon'), target('M31')]));
it('selects a complete future hour by clouds and uses its ending precipitation reading', () => {
  const hours = [hour(0, 70), hour(1, 20), hour(2, 10), hour(3, 40)];
  hours[1].precipitationProbability = 90;
  const night = buildBeginnerNight(hours, location, darkWindow, start - 1);
  const selection = selectBeginnerHour(night, 'eyes', null, start - 1);
  expect(selection.suggested?.start).toBe(start + 3600000);
  expect(selection.suggested?.weather.precipitation).toBe(5);
  expect(selection.suggested?.midpoint).toBe(start + 5400000);
});
it.each([{ cloudCover: 75 }, { precipitationProbability: 50 }, { weatherCode: 95 }, { cloudCover: null }])('withholds affirmative advice for %j', changes => {
  const night = buildBeginnerNight([hour(0), { ...hour(1), ...changes }], location, darkWindow, start - 1);
  const selection = selectBeginnerHour(night, 'eyes', null, start - 1);
  expect(selection.suggested).toBeNull();
  expect(selection.selected?.targets.length).toBeGreaterThan(0);
});
it('does not fill a weather gap or retain elapsed hours', () => {
  expect(buildBeginnerNight([hour(0), hour(2)], location, darkWindow, start - 1).hours).toEqual([]);
  expect(buildBeginnerNight([hour(0), hour(1)], location, darkWindow, start + 1).hours).toEqual([]);
});
it('preserves weather hours without optional 7Timer data but requires a local zone', () => {
  expect(buildBeginnerNight([hour(0), hour(1)], location, darkWindow, start - 1).hours).toHaveLength(1);
  expect(buildBeginnerNight([hour(0), hour(1)], { ...location, timezone: undefined }, darkWindow, start - 1).reason).toBe('timezone');
});
it('filters equipment and prefers Moon then bright planets then well-placed deep-sky targets', () => {
  const targets = [target('M13', 80), target('M31', 70), target('Saturn', 30, 1), target('Venus', 25, -4), target('Moon', 20), target('M45', 50)];
  expect(targetsForEquipment(targets, 'eyes').map(value => value.id)).toEqual(['Moon', 'Venus', 'Saturn']);
  expect(targetsForEquipment(targets.slice(0, 2), 'eyes')).toEqual([]);
  expect(targetsForEquipment(targets.slice(0, 2), 'binoculars').map(value => value.id)).toEqual(['M31']);
  expect(targetsForEquipment(targets.slice(0, 2), 'telescope').map(value => value.id)).toEqual(['M13', 'M31']);
});
it('replaces an expired shared hour with a notice and respects valid selections', () => {
  const night = buildBeginnerNight([hour(0), hour(1), hour(2)], location, darkWindow, start - 1);
  expect(selectBeginnerHour(night, 'eyes', start - 3600000, start - 1).replacedSelection).toBe(true);
  expect(selectBeginnerHour(night, 'eyes', start + 3600000, start - 1).selected?.start).toBe(start + 3600000);
  expect(selectBeginnerHour(night, 'eyes', start, start + 1).selected?.start).toBe(start + 3600000);
});
it('never fills cards when no targets qualify', () => {
  jest.mocked(getHourTargets).mockReturnValue([]);
  const night = buildBeginnerNight([hour(0), hour(1)], location, darkWindow, start - 1);
  expect(selectBeginnerHour(night, 'eyes', null, start - 1).suggested).toBeNull();
});
it('breaks equally cloudy ties by precipitation, wind, then earliest hour', () => {
  const night = buildBeginnerNight([hour(0), hour(1), hour(2), hour(3), hour(4)], location, darkWindow, start - 1);
  night.hours[0].weather.precipitation = 30;
  night.hours[1].weather.wind = 25;
  expect(selectBeginnerHour(night, 'eyes', null, start - 1).suggested?.start).toBe(start + 2 * 3600000);
});
it('retains distinct absolute periods through a repeated local clock hour', () => {
  const autumn = Date.parse('2026-11-01T04:00:00Z');
  const hours = [0, 1, 2, 3].map(offset => ({ ...hour(offset), time: new Date(autumn + offset * 3600000) }));
  const night = buildBeginnerNight(hours, location, { ...darkWindow, sunset: new Date(autumn), sunrise: new Date(autumn + 4 * 3600000) }, autumn - 1);
  expect(night.hours.map(value => value.start)).toEqual([autumn, autumn + 3600000, autumn + 7200000]);
});

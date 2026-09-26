import { getPhotographyForecast } from '@/lib/stargazer/photography';
import type { HourlyCondition, DarkWindow } from '@/lib/stargazer/types';
const start = Date.parse('2026-09-27T01:00:00Z');
const darkWindow: DarkWindow = { astronomicalDusk: new Date(start), astronomicalDawn: new Date(start + 10 * 3600000), sunset: null, sunrise: null };
const hour = (offset: number): HourlyCondition => ({ time: new Date(start + offset * 3600000), cloudCover: 0, cloudCoverLow: 0, cloudCoverMid: 0, cloudCoverHigh: 0, seeing: 1, transparency: 1, windSpeed: 0, humidity: 50, temperature: 20, dewpoint: 5, dewRisk: 'low', precipitationProbability: 0, weatherCode: 0 });
it('retains the existing valid-input photography score', () => {
  const result = getPhotographyForecast([hour(0), hour(1), hour(2)], darkWindow, 0, 0);
  expect(result.score.overall).toBe(100);
  expect(result.bestWindow?.score).toBe(100);
});
it('never averages across a missing hour or produces a best window from isolated points', () => {
  const result = getPhotographyForecast([hour(0), hour(2), hour(4)], darkWindow, 0, 0);
  expect(result.bestWindow).toBeNull();
  expect(result.hourlyConditions).toHaveLength(3);
});
it('does not score incomplete readings or substitute an empty score', () => {
  const result = getPhotographyForecast([{ ...hour(0), seeing: null }, { ...hour(1), temperature: null }], darkWindow, 0, 0);
  expect(result.score.overall).toBeNull();
  expect(result.nightAverage).toBeNull();
  expect(result.limitingFactor).toBeNull();
  expect(result.hourlyConditions.every(value => value.hourlyScore == null)).toBe(true);
});

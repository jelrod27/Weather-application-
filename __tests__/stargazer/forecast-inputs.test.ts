import { readStargazerWeather } from '@/lib/stargazer/forecast-inputs';

const instant = Date.parse('2026-09-27T01:00:00Z') / 1000;
const fixture = {
  timezone: 'America/New_York', utc_offset_seconds: -14400,
  hourly_units: { cloud_cover: '%', temperature_2m: '°C', wind_speed_10m: 'km/h', weather_code: 'wmo code' },
  hourly: { time: [instant, instant + 3600], cloud_cover: [0, 20], temperature_2m: [0, 10], wind_speed_10m: [0, 15], weather_code: [0, 95] },
};
it('retains zero, missing fields and absolute epochs distinctly', () => {
  const { hours, timeZone } = readStargazerWeather(fixture);
  expect(timeZone).toBe('America/New_York');
  expect(hours[0]).toMatchObject({ cloudCover: 0, temperature: 0, windSpeed: 0, humidity: null, dewRisk: null, precipitationProbability: null, weatherCode: 0 });
  expect(hours[0].time.getTime()).toBe(instant * 1000);
});
it('withholds incompatible units and unrecognized weather codes', () => {
  const { hours } = readStargazerWeather({ ...fixture,
    hourly_units: { ...fixture.hourly_units, wind_speed_10m: 'mph', temperature_2m: '°F' },
    hourly: { ...fixture.hourly, weather_code: [1000, 95] },
  });
  expect(hours[0]).toMatchObject({ windSpeed: null, temperature: null, weatherCode: null });
  expect(hours[1].weatherCode).toBe(95);
});
it('does not bridge duplicated instants or repair out-of-order forecasts', () => {
  const result = readStargazerWeather({ ...fixture, hourly: { ...fixture.hourly, time: [instant, instant, instant + 3600] } });
  expect(result.hours.map(hour => hour.time.getTime())).toEqual([(instant + 3600) * 1000]);
  expect(readStargazerWeather({ ...fixture, hourly: { time: [instant + 3600, instant] } }).hours).toEqual([]);
});
it('keeps a missing local zone unknown and handles malformed payloads', () => {
  expect(readStargazerWeather({ ...fixture, timezone: 'not/a-zone' }).timeZone).toBeUndefined();
  expect(readStargazerWeather(null).hours).toEqual([]);
});
it('accepts legacy provider ISO labels using the single response offset', () => {
  const { hours } = readStargazerWeather({ ...fixture, hourly: { ...fixture.hourly, time: ['2026-09-26T21:00', '2026-09-26T22:00'] } });
  expect(hours[0].time.getTime()).toBe(instant * 1000);
  expect(readStargazerWeather({ ...fixture, utc_offset_seconds: null, hourly: { time: ['2026-09-26T21:00'] } }).hours).toEqual([]);
});

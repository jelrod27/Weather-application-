const mockRequest = jest.fn();
jest.mock('@/lib/fetch-with-timeout', () => ({
  fetchWithTimeout: (...args: unknown[]) => mockRequest(...args),
}));

import { fetchOpenMeteoForecast } from '@/lib/open-meteo';

function forecast(highs: number[], unit = '°F') {
  const dates = ['2026-10-09', '2026-10-10'];
  return {
    latitude: 37.66, longitude: -121.87, elevation: 109, generationtime_ms: 1,
    timezone: 'America/Los_Angeles', timezone_abbreviation: 'PDT', utc_offset_seconds: -25200,
    current: { time: '2026-10-09T12:00', temperature_2m: 80, surface_pressure: 1015, uv_index: 5 },
    hourly_units: { temperature_2m: unit, apparent_temperature: unit, uv_index: '', visibility: 'm' },
    daily_units: {
      temperature_2m_max: unit, temperature_2m_min: unit,
      apparent_temperature_max: unit, apparent_temperature_min: unit,
    },
    hourly: {
      time: dates.flatMap(date => Array.from({ length: 24 }, (_, h) => `${date}T${String(h).padStart(2, '0')}:00`)),
      temperature_2m: highs.flatMap(high => Array<number | null>(24).fill(high)),
      apparent_temperature: highs.flatMap(high => Array<number | null>(24).fill(high - 2)),
      uv_index: Array(48).fill(5), visibility: Array(48).fill(10000),
    },
    daily: {
      time: dates, temperature_2m_max: highs,
      temperature_2m_min: highs.map(high => high - 20),
      apparent_temperature_max: highs.map(high => high - 2),
      apparent_temperature_min: highs.map(high => high - 22),
      uv_index_max: [6, 5], weather_code: [0, 1], sunrise: dates.map(date => `${date}T07:00`),
    },
  };
}

function respond(base = forecast([98.8, 94]), nbm = forecast([88.5, 79.9])) {
  mockRequest.mockImplementation(async (url: string) => ({
    ok: true,
    json: async () => new URL(url).searchParams.has('models') ? nbm : base,
  }));
  return { base, nbm };
}

beforeEach(() => mockRequest.mockReset());

it.each(['fahrenheit', 'celsius'] as const)('uses aligned NBM daily and hourly temperatures in %s, preserving other fields', async unit => {
  const metric = unit === 'celsius';
  const { base, nbm } = respond(
    forecast(metric ? [37.1, 34.4] : [98.8, 94], metric ? '°C' : '°F'),
    forecast(metric ? [31.4, 26.6] : [88.5, 79.9], metric ? '°C' : '°F'),
  );
  const before = JSON.stringify(base);
  const result = await fetchOpenMeteoForecast(37.6624, -121.8747, { countryCode: 'US', temperatureUnit: unit });
  expect(result.daily?.temperature_2m_max).toEqual(nbm.daily.temperature_2m_max);
  expect(result.daily?.temperature_2m_min).toEqual(nbm.daily.temperature_2m_min);
  expect(result.daily?.apparent_temperature_max).toEqual(nbm.daily.apparent_temperature_max);
  expect(result.hourly?.temperature_2m).toEqual(nbm.hourly.temperature_2m);
  expect(result.hourly?.apparent_temperature).toEqual(nbm.hourly.apparent_temperature);
  expect(result.current).toEqual(base.current);
  expect(result.hourly?.uv_index).toEqual(base.hourly.uv_index);
  expect(result.hourly?.visibility).toEqual(base.hourly.visibility);
  expect(result.daily?.uv_index_max).toEqual(base.daily.uv_index_max);
  expect(result.daily?.sunrise).toEqual(base.daily.sunrise);
  expect(result.daily?.weather_code).toEqual(base.daily.weather_code);
  expect(JSON.stringify(base)).toBe(before);
  const nbmUrl = new URL(mockRequest.mock.calls.find(([url]) => new URL(url).searchParams.has('models'))![0]);
  expect(nbmUrl.searchParams.get('models')).toBe('ncep_nbm_conus');
  expect(nbmUrl.searchParams.get('temperature_unit')).toBe(unit);
  expect(nbmUrl.searchParams.has('current')).toBe(false);
});

it.each([
  ['London', 51.5, -0.12, 'GB'], ['Toronto', 43.65, -79.38, 'CA'],
  ['Tijuana', 32.51, -117.04, 'MX'], ['Anchorage', 61.22, -149.9, 'US'],
  ['Honolulu', 21.3, -157.86, 'US'], ['San Juan', 18.47, -66.1, 'US'],
  ['unknown country', 37.66, -121.87, undefined],
] as const)('keeps Best Match for %s', async (_, lat, lon, countryCode) => {
  const { base } = respond();
  expect(await fetchOpenMeteoForecast(lat, lon, { countryCode })).toEqual(base);
  expect(mockRequest).toHaveBeenCalledTimes(1);
});

it.each([{ pastDays: 2 }, { forecastDays: 16 }])('preserves historical and extended requests: %j', async options => {
  const { base } = respond();
  expect(await fetchOpenMeteoForecast(37.66, -121.87, { countryCode: 'US', ...options })).toEqual(base);
  expect(mockRequest).toHaveBeenCalledTimes(1);
});

it.each(['missing hour', 'null temperature', 'null feels-like', 'shifted date', 'wrong units', 'wrong hourly units', 'different timezone', 'different UTC offset', 'empty series', 'truncated daily'])('falls back as a whole for %s', async fault => {
  const { base, nbm } = respond();
  if (fault === 'missing hour') nbm.hourly.time.pop();
  if (fault === 'null temperature') nbm.hourly.temperature_2m[25] = null;
  if (fault === 'null feels-like') nbm.hourly.apparent_temperature[25] = null;
  if (fault === 'shifted date') nbm.daily.time[0] = '2026-10-08';
  if (fault === 'wrong units') nbm.daily_units.temperature_2m_max = '°C';
  if (fault === 'wrong hourly units') nbm.hourly_units.temperature_2m = '°C';
  if (fault === 'different timezone') nbm.timezone = 'UTC';
  if (fault === 'different UTC offset') nbm.utc_offset_seconds = 0;
  if (fault === 'empty series') nbm.hourly.temperature_2m = [];
  if (fault === 'truncated daily') nbm.daily.temperature_2m_min.pop();
  expect(await fetchOpenMeteoForecast(37.66, -121.87, { countryCode: 'US' })).toEqual(base);
  expect(mockRequest).toHaveBeenCalledTimes(2);
});

it('preserves zero and negative model temperatures without treating them as missing', async () => {
  const { nbm } = respond(forecast([5, 4], '°C'), forecast([0, -4], '°C'));
  const result = await fetchOpenMeteoForecast(37.66, -121.87, { countryCode: 'US', temperatureUnit: 'celsius' });
  expect(result.daily?.temperature_2m_max).toEqual([0, -4]);
  expect(result.hourly?.temperature_2m).toEqual(nbm.hourly.temperature_2m);
});

it.each(['HTTP error', 'timeout', 'invalid JSON'])('keeps the baseline forecast when NBM has an %s', async fault => {
  const { base } = respond();
  mockRequest.mockImplementation(async (url: string) => {
    if (!new URL(url).searchParams.has('models')) return { ok: true, json: async () => base };
    if (fault === 'timeout') throw new Error('TimeoutError');
    return { ok: fault !== 'HTTP error', status: 503, text: async () => 'Unavailable', json: async () => { throw new Error('Invalid JSON'); } };
  });
  expect(await fetchOpenMeteoForecast(37.66, -121.87, { countryCode: 'US' })).toEqual(base);
  expect(mockRequest).toHaveBeenCalledWith(expect.stringContaining('models=ncep_nbm_conus'), expect.objectContaining({ maxRetries: 0, timeoutMs: 3000 }));
});

it('does not mask failure of the required baseline request', async () => {
  respond();
  mockRequest.mockRejectedValueOnce(new Error('Baseline unavailable'));
  await expect(fetchOpenMeteoForecast(37.66, -121.87, { countryCode: 'US' })).rejects.toThrow('Baseline unavailable');
});

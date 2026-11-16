/** @jest-environment node */
import { fetchForecastOutlook } from '../../scripts/newsletter/data/forecast';

const NOW = new Date('2026-11-16T01:00:00.000Z');
function payload(): Record<string, unknown> {
  return {
    utc_offset_seconds: 0,
    daily_units: { temperature_2m_max: '°F', temperature_2m_min: '°F', precipitation_sum: 'inch', precipitation_probability_max: '%' },
    daily: {
      time: Array.from({ length: 7 }, (_, i) => `2026-11-${16 + i}`),
      temperature_2m_max: Array(7).fill(60), temperature_2m_min: Array(7).fill(40),
      precipitation_sum: Array(7).fill(0), precipitation_probability_max: Array(7).fill(0), weather_code: Array(7).fill(0),
    },
  };
}
const json = (body: unknown): Response => new Response(JSON.stringify(body));
afterEach(() => jest.restoreAllMocks());

it('recovers every city through the site forecast API when direct connections time out', async () => {
  const requests = jest.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = new URL(String(input));
    if (url.hostname === 'api.open-meteo.com') throw new TypeError('fetch failed', { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } });
    expect(url.origin).toBe('https://www.16bitweather.co');
    expect(url.pathname).toBe('/api/open-meteo/forecast');
    expect(url.searchParams.get('timezone')).toBe('UTC');
    expect(url.searchParams.get('days')).toBe('7');
    return json(payload());
  });
  const result = await fetchForecastOutlook(NOW);
  expect(result.data?.conusQuadrants).toHaveLength(6);
  expect(result.data?.international).toHaveLength(3);
  expect(result.sources.every(source => source.status === 'complete' && source.records === 7)).toBe(true);
  expect(result.sources.every(source => source.url.startsWith('https://www.16bitweather.co/api/open-meteo/forecast?'))).toBe(true);
  expect(JSON.parse(result.sources[0].snapshot!).attempts[0].reasons).toEqual(['Connection timed out']);
  expect(requests).toHaveBeenCalled();
});

it('keeps both failed access paths in the audit without copying raw exception messages', async () => {
  jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('sensitive-message-that-must-not-be-persisted'));
  const result = await fetchForecastOutlook(NOW);
  expect(result.data).toBeNull();
  expect(JSON.parse(result.sources[0].snapshot!).attempts).toHaveLength(2);
  expect(JSON.stringify(result.sources)).not.toContain('sensitive-message');
});

it('retries a transient primary failure before falling back', async () => {
  const attempts = new Map<string, number>();
  jest.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = String(input);
    const count = (attempts.get(url) ?? 0) + 1;
    attempts.set(url, count);
    return count === 1 ? new Response('', { status: 503 }) : json(payload());
  });
  const result = await fetchForecastOutlook(NOW);
  expect(result.sources.every(source => source.status === 'complete')).toBe(true);
  expect([...attempts.values()]).toEqual(Array(9).fill(2));
  expect([...attempts.keys()].every(url => url.startsWith('https://api.open-meteo.com/'))).toBe(true);
});

it.each(['wrong timezone', 'wrong units', 'invalid dates'])('rejects fallback data with %s', async fault => {
  jest.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    if (new URL(String(input)).hostname === 'api.open-meteo.com') return new Response('', { status: 403 });
    const body = payload();
    if (fault === 'wrong timezone') body.utc_offset_seconds = -18000;
    if (fault === 'wrong units') body.daily_units = { temperature_2m_max: '°C' };
    if (fault === 'invalid dates') (body.daily as Record<string, unknown>).time = ['2025-11-16'];
    return json(body);
  });
  const result = await fetchForecastOutlook(NOW);
  expect(result.data).toBeNull();
  expect(result.sources.every(source => !source.usable)).toBe(true);
});

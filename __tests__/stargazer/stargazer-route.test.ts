/**
 * Route-level tests for /api/stargazer
 *
 * Pins: parameter validation, upstream-failure degradation, the full response
 * contract under degraded externals (7Timer/ISS/geocoding all null/failed), and
 * timezone-suffix sign handling.
 *
 * Astronomy math (lib/stargazer/astronomy, score, bortle) runs REAL — it is
 * deterministic and fast in jsdom. Only network-touching modules are mocked.
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}));

jest.mock('@/lib/services/weather-rate-limiter', () => ({
  rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true }),
}));

jest.mock('@/lib/fetch-with-timeout', () => ({
  fetchWithTimeout: jest.fn(),
}));

jest.mock('@/lib/stargazer/seven-timer', () => ({
  fetchSevenTimerData: jest.fn().mockResolvedValue(null),
  getSevenTimerAtTime: jest.requireActual('@/lib/stargazer/seven-timer').getSevenTimerAtTime,
}));

jest.mock('@/lib/stargazer/satellites', () => ({
  fetchISSTLE: jest.fn().mockResolvedValue(null),
  calculateISSPasses: jest.fn(() => []),
}));

jest.mock('@/lib/stargazer/launches', () => ({
  fetchUpcomingLaunches: jest.fn().mockResolvedValue([]),
}));

import { fetchSevenTimerData } from '@/lib/stargazer/seven-timer';
import { GET } from '@/app/api/stargazer/route';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';

const mockFetchWithTimeout = fetchWithTimeout as jest.MockedFunction<typeof fetchWithTimeout>;
const mockRateLimit = rateLimitRequest as jest.MockedFunction<typeof rateLimitRequest>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRequest = (params: Record<string, string>) =>
  ({
    nextUrl: { searchParams: new URLSearchParams(params) },
  }) as unknown as Parameters<typeof GET>[0];

/** Build a two-day Open-Meteo hourly fixture (48 entries) with benign constants. */
const makeOpenMeteoBody = (utcOffsetSeconds: number, startDay = '2026-06-15') => {
  const time: string[] = [];
  for (let d = 0; d < 2; d++) {
    for (let h = 0; h < 24; h++) {
      const day = new Date(Date.parse(`${startDay}T00:00:00Z`) + d * 86400000).toISOString().slice(0, 10);
      time.push(`${day}T${String(h).padStart(2, '0')}:00`);
    }
  }
  const n = time.length;
  const fill = (v: number) => Array.from({ length: n }, () => v);
  return {
    timezone: 'America/New_York',
    utc_offset_seconds: utcOffsetSeconds,
    hourly_units: { cloud_cover: '%', cloud_cover_low: '%', cloud_cover_mid: '%', cloud_cover_high: '%', relative_humidity_2m: '%', dewpoint_2m: '°C', temperature_2m: '°C', wind_speed_10m: 'km/h', precipitation_probability: '%', weather_code: 'wmo code' },
    hourly: {
      time,
      cloud_cover: fill(20),
      cloud_cover_low: fill(10),
      cloud_cover_mid: fill(5),
      cloud_cover_high: fill(5),
      relative_humidity_2m: fill(50),
      dewpoint_2m: fill(8),
      temperature_2m: fill(18),
      wind_speed_10m: fill(10),
      precipitation_probability: fill(0),
      weather_code: fill(0),
      visibility: fill(20000),
      surface_pressure: fill(1015),
    },
  };
};

/** Set up fetchWithTimeout to return a nominal Open-Meteo response + failed nominatim. */
const setupNominalFetches = (utcOffsetSeconds = -18000, startDay = '2026-06-15') => {
  mockFetchWithTimeout.mockImplementation((url: string) => {
    const urlStr = String(url);
    if (urlStr.startsWith('https://api.open-meteo.com/')) {
      return Promise.resolve({
        ok: true,
        json: async () => makeOpenMeteoBody(utcOffsetSeconds, startDay),
      } as Response);
    }
    if (urlStr.startsWith('https://nominatim.openstreetmap.org/')) {
      return Promise.resolve({ ok: false } as Response);
    }
    return Promise.resolve({ ok: false } as Response);
  });
};

// ---------------------------------------------------------------------------
// describe: Validation & upstream failures
// ---------------------------------------------------------------------------

describe('GET /api/stargazer — validation and upstream failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupNominalFetches();
    jest.useFakeTimers({
      now: new Date('2026-06-15T04:00:00Z'),
      doNotFake: ['queueMicrotask', 'setImmediate'],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 400 when lat and lon are both missing', async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    expect(mockRateLimit).toHaveBeenCalledWith(expect.anything(), 'content');
    const body = await res.json();
    expect(body.error).toBe('lat and lon query parameters are required');
  });

  it('returns 400 when lat is missing', async () => {
    const res = await GET(makeRequest({ lon: '0' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('lat and lon query parameters are required');
  });

  it('returns 400 for lat out of range (91)', async () => {
    const res = await GET(makeRequest({ lat: '91', lon: '0' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid lat\/lon values/);
  });

  it('returns 400 for non-numeric lat', async () => {
    const res = await GET(makeRequest({ lat: 'abc', lon: '0' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid lat\/lon values/);
  });

  it.each(['51garbage', '0x10', 'Infinity', '   '])('rejects malformed coordinate %s', async (lat) => {
    const res = await GET(makeRequest({ lat, lon: '0' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for lon out of range (181)', async () => {
    const res = await GET(makeRequest({ lat: '0', lon: '181' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid lat\/lon values/);
  });

  it('returns 502 when Open-Meteo responds with a non-ok status', async () => {
    mockFetchWithTimeout.mockImplementation((url: string) => {
      if (String(url).startsWith('https://api.open-meteo.com/')) {
        return Promise.resolve({ ok: false, status: 503 } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    });

    const res = await GET(makeRequest({ lat: '40.71', lon: '-74.01' }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('Failed to fetch weather data from Open-Meteo');
  });

  it('returns the rate-limit response object directly when denied', async () => {
    const mockLimitResponse = { status: 429, json: async () => ({}) };
    mockRateLimit.mockResolvedValueOnce({
      allowed: false,
      response: mockLimitResponse as unknown as ReturnType<typeof mockRateLimit> extends Promise<infer T> ? (T extends { response: infer R } ? R : never) : never,
    });

    const res = await GET(makeRequest({ lat: '40.71', lon: '-74.01' }));
    // The route returns the response object as-is (identity)
    expect(res).toBe(mockLimitResponse);
  });

  it('returns 500 when fetchWithTimeout throws for the Open-Meteo URL', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchWithTimeout.mockRejectedValue(new Error('network timeout'));

    const res = await GET(makeRequest({ lat: '40.71', lon: '-74.01' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe(
      'Internal server error while computing stargazer forecast',
    );
    // Routes now report through logRouteError, which logs to the console AND
    // captures to Sentry — the console side keeps the same tag.
    expect(consoleErrorSpy).toHaveBeenCalledWith('[Stargazer]', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// describe: Happy-path contract (degraded externals)
// ---------------------------------------------------------------------------

describe('GET /api/stargazer — contract with degraded externals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupNominalFetches(-18000); // UTC-5 (New York-ish)
    // Freeze time: 04:00 UTC = 23:00 the previous evening in New York — inside
    // the night for lat 40.71 on 2026-06-15.
    jest.useFakeTimers({
      now: new Date('2026-06-15T04:00:00Z'),
      doNotFake: ['queueMicrotask', 'setImmediate'],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps weather available when optional 7Timer initialization has the wrong JSON type', async () => {
    jest.mocked(fetchSevenTimerData).mockResolvedValueOnce(JSON.parse(JSON.stringify({
      product: 'astro', init: 2026061500, dataseries: [{ timepoint: 3, seeing: 2, transparency: 2 }],
    })));
    const response = await GET(makeRequest({ lat: '40.71', lon: '-74.01' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.hourlyConditions.length).toBeGreaterThan(0);
    expect(body.hourlyConditions.every((hour: { seeing: unknown }) => hour.seeing === null)).toBe(true);
  });

  it('returns 200 with the full response contract when externals are degraded', async () => {
    const res = await GET(makeRequest({ lat: '40.71', lon: '-74.01' }));
    expect(res.status).toBe(200);

    const body = await res.json();

    // All top-level keys must be present
    const requiredKeys = [
      'score',
      'bestWindow',
      'nightAverage',
      'limitingFactor',
      'darkWindow',
      'hourlyConditions',
      'moon',
      'planets',
      'deepSkyHighlights',
      'skyEvents',
      'issPasses',
      'launches',
      'meteorShowers',
      'location',
      'generatedAt',
    ];
    for (const key of requiredKeys) {
      expect(body).toHaveProperty(key);
    }

    expect(body.score.overall).toBeNull();
    expect(body.score.label).toBe('Unavailable');
    expect(body.bestWindow).toBeNull();
    expect(body.nightAverage).toBeNull();
    expect(body.limitingFactor).toBeNull();

    // Degraded externals: ISS/launches are empty
    expect(body.issPasses).toEqual([]);
    expect(body.launches).toEqual([]);

    // Optional-provider failure must not invent readings or a complete score
    expect(body.hourlyConditions.length).toBeGreaterThan(0);
    for (const hour of body.hourlyConditions) {
      expect(hour.seeing).toBeNull();
      expect(hour.transparency).toBeNull();
    }

    // Geocode degradation → locationName and displayName are undefined
    expect(body.location.timezone).toBe('America/New_York');
    expect(body.location.name).toBeUndefined();
    expect(body.location.displayName).toBeUndefined();
    // Unknown population is not a sky-darkness observation
    expect(body.location.bortle).toBeUndefined();

    // Sunset→sunrise filter: more than 0 but fewer than 48 hourly entries
    expect(body.hourlyConditions.length).toBeGreaterThan(0);
    expect(body.hourlyConditions.length).toBeLessThan(48);
  });
});

// ---------------------------------------------------------------------------
// describe: Timezone-suffix sanity
// ---------------------------------------------------------------------------

describe('GET /api/stargazer — timezone-suffix handling', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('positive offset (+09:00, Tokyo-like): hourlyConditions is non-empty', async () => {
    // Freeze at 14:00 UTC = 23:00 Tokyo time — inside the night for lat 35.68
    jest.useFakeTimers({
      now: new Date('2026-06-15T14:00:00Z'),
      doNotFake: ['queueMicrotask', 'setImmediate'],
    });

    mockFetchWithTimeout.mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.startsWith('https://api.open-meteo.com/')) {
        return Promise.resolve({
          ok: true,
          json: async () => makeOpenMeteoBody(32400), // UTC+9
        } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    });

    const res = await GET(makeRequest({ lat: '35.68', lon: '139.69' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // If the +09:00 suffix was mis-built, every parsed hour would fall outside
    // the sunset→sunrise window and the array would be empty.
    expect(body.hourlyConditions.length).toBeGreaterThan(0);
  });

  it('negative offset (-05:00, New York-like): hourlyConditions is non-empty', async () => {
    // Freeze at 04:00 UTC = 23:00 New York time — inside the night for lat 40.71
    jest.useFakeTimers({
      now: new Date('2026-06-15T04:00:00Z'),
      doNotFake: ['queueMicrotask', 'setImmediate'],
    });

    mockFetchWithTimeout.mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.startsWith('https://api.open-meteo.com/')) {
        return Promise.resolve({
          ok: true,
          json: async () => makeOpenMeteoBody(-18000), // UTC-5
        } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    });

    const res = await GET(makeRequest({ lat: '40.71', lon: '-74.01' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // If the -05:00 suffix sign was wrong, every hour would be mis-parsed and
    // could fall outside the window.
    expect(body.hourlyConditions.length).toBeGreaterThan(0);
  });
});

describe('absolute provider timestamps', () => {
  afterEach(() => jest.useRealTimers());
  it('keeps UNIX hourly timestamps as instants rather than applying an offset twice', async () => {
    jest.useFakeTimers({ now: new Date('2026-06-15T04:00:00Z'), doNotFake: ['queueMicrotask', 'setImmediate'] });
    const fixture = makeOpenMeteoBody(-14400);
    const epoch = Date.parse('2026-06-15T02:00:00Z') / 1000;
    mockFetchWithTimeout.mockImplementation(async (url) => ({
      ok: String(url).startsWith('https://api.open-meteo.com/'),
      json: async () => ({ ...fixture, hourly: { ...fixture.hourly, time: [epoch] } }),
    } as Response));
    const res = await GET(makeRequest({ lat: '40.71', lon: '-74.01' }));
    const body = await res.json();
    expect(body.hourlyConditions[0].time.getTime()).toBe(epoch * 1000);
  });
});


it('offers no dark-window observing targets when the sun never reaches astronomical night', async () => {
  jest.useFakeTimers({ now: new Date('2026-06-21T12:00:00Z'), doNotFake: ['queueMicrotask', 'setImmediate'] });
  setupNominalFetches(7200, '2026-06-21');
  const res = await GET(makeRequest({ lat: '59.33', lon: '18.07' }));
  const body = await res.json();
  expect(body.darkWindow.status).toBe('none');
  expect(body.planets).toEqual([]);
  expect(body.deepSkyHighlights).toEqual([]);
  expect(body.bestWindow).toBeNull();
  expect(body.score.overall).toBeNull();
  expect(body.score.label).toBe('Unavailable');
  expect(body.score.subScores).toBeNull();
  expect(body.nightAverage).toBeNull();
  expect(body.limitingFactor).toBeNull();
  expect(body.hourlyConditions.length).toBeGreaterThan(0);
  expect(body.hourlyConditions.every((hour: { hourlyScore?: number }) => hour.hourlyScore == null)).toBe(true);
  expect(body.hourlyConditions.every((hour: { hourlySubScores?: unknown }) => hour.hourlySubScores == null)).toBe(true);
  jest.useRealTimers();
});


describe('unavailable forecast values', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date('2026-06-15T04:00:00Z'), doNotFake: ['queueMicrotask', 'setImmediate'] }));
  afterEach(() => jest.useRealTimers());
  it.each([null, -1, 101, '0'])('does not turn invalid cloud %s into clear sky', async cloud => {
    const fixture = makeOpenMeteoBody(-14400);
    mockFetchWithTimeout.mockImplementation(async url => ({
      ok: String(url).startsWith('https://api.open-meteo.com/'),
      json: async () => ({ ...fixture, hourly: { ...fixture.hourly, cloud_cover: fixture.hourly.time.map(() => cloud) } }),
    } as Response));
    const body = await (await GET(makeRequest({ lat: '40.71', lon: '-74.01' }))).json();
    expect(body.hourlyConditions.length).toBeGreaterThan(0);
    expect(body.hourlyConditions.every((hour: { cloudCover: unknown }) => hour.cloudCover === null)).toBe(true);
    expect(body.score.overall).toBeNull();
  });
  it('keeps true zeroes and exposes precipitation, weather code and separate retrieval metadata', async () => {
    const fixture = makeOpenMeteoBody(-14400);
    mockFetchWithTimeout.mockImplementation(async url => ({
      ok: String(url).startsWith('https://api.open-meteo.com/'),
      headers: new Headers({ date: 'Mon, 15 Jun 2026 03:55:00 GMT' }),
      json: async () => fixture,
    } as Response));
    const body = await (await GET(makeRequest({ lat: '40.71', lon: '-74.01' }))).json();
    expect(body.hourlyConditions[0]).toMatchObject({ precipitationProbability: 0, weatherCode: 0 });
    expect(body.weatherRetrievedAt).toBe('2026-06-15T03:55:00.000Z');
    expect(body.generatedAt).toBe('2026-06-15T04:00:00.000Z');
  });
  it('shows empty data as unavailable, without a 50/100 fallback', async () => {
    const fixture = makeOpenMeteoBody(-14400);
    mockFetchWithTimeout.mockImplementation(async url => ({
      ok: String(url).startsWith('https://api.open-meteo.com/'),
      json: async () => ({ ...fixture, hourly: { time: [] } }),
    } as Response));
    const body = await (await GET(makeRequest({ lat: '40.71', lon: '-74.01' }))).json();
    expect(body.hourlyConditions).toEqual([]);
    expect(body.score.overall).toBeNull();
    expect(body.bestWindow).toBeNull();
  });
});

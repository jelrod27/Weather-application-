/**
 * @jest-environment node
 *
 * The space-weather group had no tests at all. One mocked SWPC adapter now
 * covers the shared series handler and both routes built on it.
 *
 * Runs in the node environment so the real NextResponse is exercised rather
 * than a hand-rolled stand-in for it.
 */

jest.mock('@/lib/services/swpc-proxy', () => ({
  fetchSwpcJson: jest.fn(),
  fetchSwpc: jest.fn(),
}));

jest.mock('@/lib/error-utils', () => ({
  logRouteError: jest.fn(),
}));

import { fetchSwpcJson } from '@/lib/services/swpc-proxy';
import { logRouteError } from '@/lib/error-utils';
import {
  finiteRounded,
  SPACE_WEATHER_CACHE,
  swpcSeriesRoute,
  SWPC_GOES_SOURCE,
} from '@/lib/space-weather/series-route';

const mockFetch = fetchSwpcJson as jest.MockedFunction<typeof fetchSwpcJson>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('finiteRounded', () => {
  it('rounds to the requested precision', () => {
    expect(finiteRounded(1.23456)).toBe(1.23);
    expect(finiteRounded(1.23456, 3)).toBe(1.235);
  });

  it('rejects values that are not usable numbers', () => {
    expect(finiteRounded(null)).toBeNull();
    expect(finiteRounded(undefined)).toBeNull();
    expect(finiteRounded(NaN)).toBeNull();
    expect(finiteRounded(Infinity)).toBeNull();
    expect(finiteRounded('4')).toBeNull();
  });

  it('keeps zero, which a truthiness check would drop', () => {
    expect(finiteRounded(0)).toBe(0);
  });
});

describe('swpcSeriesRoute', () => {
  const handler = swpcSeriesRoute<{ t: string; v: number | null }, { time: string; value: number }>({
    context: 'Test Series',
    url: 'https://services.swpc.noaa.gov/json/test.json',
    source: SWPC_GOES_SOURCE,
    errorMessage: 'Failed to fetch test data',
    toPoint: (row) => {
      const value = finiteRounded(row.v);
      return value === null ? null : { time: row.t, value };
    },
  });

  it('maps rows and wraps them in the standard envelope', async () => {
    mockFetch.mockResolvedValue([
      { t: '2026-08-01T00:00Z', v: 1.23456 },
      { t: '2026-08-01T01:00Z', v: 4.2 },
    ]);

    const res = await handler();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      data: [
        { time: '2026-08-01T00:00Z', value: 1.23 },
        { time: '2026-08-01T01:00Z', value: 4.2 },
      ],
      source: SWPC_GOES_SOURCE,
    });
    expect(res.headers.get('Cache-Control')).toBe(SPACE_WEATHER_CACHE.standard);
  });

  it('drops rows the transform rejects rather than emitting holes', async () => {
    mockFetch.mockResolvedValue([
      { t: 'a', v: 1 },
      { t: 'b', v: null },
      { t: 'c', v: 3 },
    ]);

    const body = await (await handler()).json();
    expect(body.data).toEqual([
      { time: 'a', value: 1 },
      { time: 'c', value: 3 },
    ]);
  });

  it('returns an empty series rather than failing when upstream has no rows', async () => {
    mockFetch.mockResolvedValue([]);
    const res = await handler();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: [], source: SWPC_GOES_SOURCE });
  });

  it('logs and returns 500 with the route wording when upstream fails', async () => {
    mockFetch.mockRejectedValue(new Error('SWPC 503'));

    const res = await handler();
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'Failed to fetch test data' });
    expect(logRouteError).toHaveBeenCalledWith('Test Series', expect.any(Error));
  });

  it('honors a cache-tier override', async () => {
    const realtime = swpcSeriesRoute<{ v: number }, { value: number }>({
      context: 'Realtime',
      url: 'https://example.test/x.json',
      source: SWPC_GOES_SOURCE,
      errorMessage: 'nope',
      cacheControl: SPACE_WEATHER_CACHE.realtime,
      toPoint: (row) => ({ value: row.v }),
    });
    mockFetch.mockResolvedValue([{ v: 1 }]);
    const res = await realtime();
    expect(res.headers.get('Cache-Control')).toBe(SPACE_WEATHER_CACHE.realtime);
  });
});

describe('magnetometer route', () => {
  it('reads the Hp component, rounds it, and drops unusable rows', async () => {
    const { GET } = await import('@/app/api/space-weather/magnetometer/route');
    mockFetch.mockResolvedValue([
      { time_tag: 't1', satellite: '18', He: 1, Hp: 12.3456, Hn: 1, total: 1 },
      { time_tag: 't2', satellite: '18', He: 1, Hp: null as unknown as number, Hn: 1, total: 1 },
    ]);

    const body = await (await GET()).json();
    expect(body.data).toEqual([{ time: 't1', hp: 12.35 }]);
    expect(body.source).toBe(SWPC_GOES_SOURCE);
  });
});

describe('proton-flux route', () => {
  it('keeps only the >= 10 MeV channel, parsing SWPC comparator labels', async () => {
    // SWPC labels the channel ">=10 MeV". A bare parseFloat on that returns
    // NaN, which previously dropped every row and left the series empty.
    const { GET } = await import('@/app/api/space-weather/proton-flux/route');
    mockFetch.mockResolvedValue([
      { time_tag: 't1', satellite: '18', flux: 0.5, energy: '>=10 MeV' },
      { time_tag: 't2', satellite: '18', flux: 0.9, energy: '>=1 MeV' },
      { time_tag: 't3', satellite: '18', flux: 0.7, energy: '>=100 MeV' },
    ]);

    const body = await (await GET()).json();
    expect(body.data).toEqual([
      { time: 't1', flux: 0.5 },
      { time: 't3', flux: 0.7 },
    ]);
  });

  it('still parses a plain numeric energy label', async () => {
    const { GET } = await import('@/app/api/space-weather/proton-flux/route');
    mockFetch.mockResolvedValue([
      { time_tag: 't1', satellite: '18', flux: 0.5, energy: '10 MeV' },
      { time_tag: 't2', satellite: '18', flux: 0.9, energy: '5 MeV' },
    ]);

    const body = await (await GET()).json();
    expect(body.data).toEqual([{ time: 't1', flux: 0.5 }]);
  });

  it('surfaces the route-specific error wording on failure', async () => {
    const { GET } = await import('@/app/api/space-weather/proton-flux/route');
    mockFetch.mockRejectedValue(new Error('boom'));

    const res = await GET();
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'Failed to fetch proton flux data' });
  });
});

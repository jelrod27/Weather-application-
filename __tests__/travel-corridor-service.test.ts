/**
 * Unit tests for Travel Corridor Service
 */

import { scoreWeatherSeverity, getSeverityLevel, SEVERITY_COLORS, getWorstCorridors, getHazardDescription, fetchWeatherForWaypoints, type CorridorResult } from '@/lib/services/travel-corridor-service';

describe('Travel Corridor Service', () => {
  describe('scoreWeatherSeverity', () => {
    it('should return 0 for clear weather conditions', () => {
      const score = scoreWeatherSeverity({
        precipitation: 0,
        snowfall: 0,
        windGusts: 5,
        visibility: 10000,
        freezingLevel: 3000,
      });
      expect(score).toBe(0);
    });

    it('should score heavy rain higher than light rain', () => {
      const light = scoreWeatherSeverity({ precipitation: 1, snowfall: 0, windGusts: 5, visibility: 10000, freezingLevel: 3000 });
      const heavy = scoreWeatherSeverity({ precipitation: 5, snowfall: 0, windGusts: 5, visibility: 10000, freezingLevel: 3000 });
      expect(heavy).toBeGreaterThan(light);
      expect(light).toBeGreaterThan(0);
    });

    it('should cap score at 100', () => {
      const score = scoreWeatherSeverity({ precipitation: 20, snowfall: 10, windGusts: 120, visibility: 100, freezingLevel: 0 });
      expect(score).toBe(100);
    });

    it('should return 0 for NaN or Infinity inputs', () => {
      const score = scoreWeatherSeverity({ precipitation: NaN, snowfall: Infinity, windGusts: NaN, visibility: NaN, freezingLevel: 0 });
      expect(score).toBe(0);
    });
  });

  describe('getSeverityLevel', () => {
    it('should map scores to correct severity levels', () => {
      expect(getSeverityLevel(0)).toBe('green');
      expect(getSeverityLevel(24)).toBe('green');
      expect(getSeverityLevel(25)).toBe('yellow');
      expect(getSeverityLevel(50)).toBe('orange');
      expect(getSeverityLevel(75)).toBe('red');
    });
  });

  describe('SEVERITY_COLORS', () => {
    it('should have hex colors for each severity level', () => {
      expect(SEVERITY_COLORS.green).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(SEVERITY_COLORS.yellow).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(SEVERITY_COLORS.orange).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(SEVERITY_COLORS.red).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe('getWorstCorridors', () => {
    it('should return corridors sorted by worst score descending', () => {
      const corridors: CorridorResult[] = [
        { name: 'I-70', score: 10, level: 'green', color: '#22c55e', hazard: 'Clear', segments: [], coverage: { available: 1, total: 1 }, worstPoint: null },
        { name: 'I-90', score: 80, level: 'red', color: '#ef4444', hazard: 'Heavy snow', segments: [], coverage: { available: 1, total: 1 }, worstPoint: null },
        { name: 'I-95', score: 40, level: 'yellow', color: '#eab308', hazard: 'Rain', segments: [], coverage: { available: 1, total: 1 }, worstPoint: null },
      ];
      const worst = getWorstCorridors(corridors, 2);
      expect(worst).toHaveLength(2);
      expect(worst[0].name).toBe('I-90');
      expect(worst[1].name).toBe('I-95');
    });
  });

  describe('getHazardDescription', () => {
    it('should describe snow as primary hazard when snowfall is highest factor', () => {
      const desc = getHazardDescription({ precipitation: 0, snowfall: 3, windGusts: 10, visibility: 10000, freezingLevel: 3000 });
      expect(desc.toLowerCase()).toContain('snow');
    });
  });
});

describe('fetchWeatherForWaypoints', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    jest.clearAllMocks();
  });

  it('returns [] without fetching when given no waypoints', async () => {
    const mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
    const result = await fetchWeatherForWaypoints([], 0);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('maps current conditions per waypoint for forecastDay 0', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { current: { precipitation: 2, snowfall: 0, wind_gusts_10m: 30, visibility: 8000 } },
        { current: { precipitation: 0, snowfall: 1, wind_gusts_10m: 50, visibility: 4000 } },
      ],
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await fetchWeatherForWaypoints([[40, -100], [41, -101]], 0);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ precipitation: 2, windGusts: 30, visibility: 8000 });
    expect(result[1]).toMatchObject({ snowfall: 1, windGusts: 50, visibility: 4000 });

    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(url.searchParams.get('latitude')).toBe('40,41');
    expect(url.searchParams.get('current')).toContain('precipitation');
    expect(url.searchParams.get('hourly')).toBeNull();
  });

  it('samples the midday hour of the requested forecast day', async () => {
    // forecastDay 1 → targetHour = 1*24 + 12 = 36
    const hourlyLen = 48;
    const precipitation = Array.from({ length: hourlyLen }, (_, i) => i);
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        timezone: 'UTC', utc_offset_seconds: 0,
        hourly: {
          time: Array.from({ length: hourlyLen }, (_, i) => new Date(Date.parse(new Date(Date.now()).toISOString().slice(0,10) + 'T00:00Z') + i * 3600000).toISOString().slice(0,16)),
          precipitation,
          snowfall: new Array(hourlyLen).fill(0),
          wind_gusts_10m: new Array(hourlyLen).fill(10),
          visibility: new Array(hourlyLen).fill(9000),
        },
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await fetchWeatherForWaypoints([[40, -100]], 1);

    expect(result[0]?.precipitation).toBe(36);
    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(url.searchParams.get('hourly')).toContain('precipitation');
    expect(url.searchParams.get('forecast_days')).toBe('2');
  });

  it('throws when the upstream response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
    await expect(fetchWeatherForWaypoints([[40, -100]], 0)).rejects.toThrow('503');
  });

  it('keeps missing current/hourly unavailable', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{}] }) as unknown as typeof fetch;
    const result = await fetchWeatherForWaypoints([[40, -100]], 0);
    expect(result[0]).toBeNull();
  });

  it('passes a custom User-Agent header', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ current: {} }] });
    global.fetch = mockFetch as unknown as typeof fetch;
    await fetchWeatherForWaypoints([[40, -100]], 0, { userAgent: 'test-agent' });
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['User-Agent']).toBe('test-agent');
  });
});

it('does not replace a missing future hour with an earlier clear hour', async () => {
  const original = global.fetch
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ hourly: { precipitation: [0], snowfall: [0], wind_gusts_10m: [0], visibility: [10000] } }) })
  try { expect(await fetchWeatherForWaypoints([[40, -105]], 2)).toEqual([null]) }
  finally { global.fetch = original }
})

it('selects actual location-local noon across a daylight-saving change', async () => {
  const original = global.fetch
  const clock = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-24T12:00Z'))
  const time = Array.from({ length: 48 }, (_, i) => new Date(Date.parse('2026-10-24T00:00Z') + i * 3600000).toISOString().slice(0,16))
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ timezone: 'Europe/London', utc_offset_seconds: 3600, hourly: { time, precipitation: time.map((_,i) => i), snowfall: time.map(() => 0), wind_gusts_10m: time.map(() => 0), visibility: time.map(() => 10000) } }) })
  try {
    const [sample] = await fetchWeatherForWaypoints([[51.5, -.12]], 1)
    expect(sample?.sampledAt).toBe('2026-10-25T12:00:00.000Z')
    expect(sample?.precipitation).toBe(37)
  } finally { global.fetch = original; clock.mockRestore() }
})

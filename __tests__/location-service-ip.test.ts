/**
 * Unit tests for LocationService IP-based geolocation fallback.
 *
 * Regression coverage for the 2026-06 review:
 * - ipinfo.io responses without "loc" must be rejected, not defaulted to
 *   "0,0" (Null Island).
 * - Each provider attempt is bounded with a timeout signal.
 * - The dead api.ipgeolocation.io provider (invalid "apiKey=free") is gone.
 */

import { LocationService } from '@/lib/location-service';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

const service = LocationService.getInstance();

function mockFetchByUrl(handlers: Record<string, { ok: boolean; body?: unknown }>) {
  const calls: string[] = [];
  global.fetch = jest.fn().mockImplementation((url: string) => {
    calls.push(url);
    for (const [match, response] of Object.entries(handlers)) {
      if (url.includes(match)) {
        return Promise.resolve({
          ok: response.ok,
          status: response.ok ? 200 : 429,
          json: async () => response.body,
        });
      }
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  }) as unknown as typeof fetch;
  return calls;
}

describe('getLocationByIP', () => {
  it('returns parsed location from ipapi.co', async () => {
    mockFetchByUrl({
      'ipapi.co': {
        ok: true,
        body: { latitude: 41.88, longitude: -87.63, city: 'Chicago', region: 'Illinois', country_name: 'United States' },
      },
    });

    const location = await service.getLocationByIP();
    expect(location.latitude).toBe(41.88);
    expect(location.longitude).toBe(-87.63);
    expect(location.source).toBe('ip');
  });

  it('rejects ipinfo responses missing loc instead of returning Null Island', async () => {
    mockFetchByUrl({
      'ipapi.co': { ok: false },
      // 200 response without "loc" — bogon/anonymous tier shape.
      'ipinfo.io': { ok: true, body: { city: 'Somewhere', country: 'US' } },
    });

    await expect(service.getLocationByIP()).rejects.toBeDefined();
  });

  it('falls back from ipapi.co to ipinfo.io when loc is present', async () => {
    mockFetchByUrl({
      'ipapi.co': { ok: false },
      'ipinfo.io': { ok: true, body: { loc: '35.68,139.69', city: 'Tokyo', region: 'Tokyo', country: 'JP' } },
    });

    const location = await service.getLocationByIP();
    expect(location.latitude).toBe(35.68);
    expect(location.longitude).toBe(139.69);
  });

  it('bounds every provider attempt with an abort signal and never calls ipgeolocation.io', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(service.getLocationByIP()).rejects.toBeDefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const call of fetchMock.mock.calls) {
      expect(call[0]).not.toContain('ipgeolocation.io');
      expect(call[1]?.signal).toBeInstanceOf(AbortSignal);
    }
  });
});

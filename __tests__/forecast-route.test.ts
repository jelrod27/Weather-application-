/**
 * Unit tests for /api/weather/forecast.
 *
 * Pins the Batch 3 security fix: upstream OpenWeather failures must collapse to
 * a generic 502 (never leak the raw upstream status to the client), and a
 * successful response must carry a Cache-Control header.
 */

jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string;
    headers: Map<string, string>;
    nextUrl: { searchParams: URLSearchParams };
    constructor(url: string) {
      this.url = url;
      this.headers = new Map();
      this.nextUrl = { searchParams: new URLSearchParams(new URL(url).search) };
    }
  },
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status || 200,
      headers: init?.headers || {},
      json: async () => body,
    })),
  },
}));

jest.mock('@/lib/services/weather-rate-limiter', () => ({
  rateLimitRequest: jest.fn().mockResolvedValue({ allowed: true, headers: {} }),
}));

import { GET } from '@/app/api/weather/forecast/route';
import { NextRequest } from 'next/server';

const originalFetch = global.fetch;
const mockFetch = jest.fn();
global.fetch = mockFetch as typeof global.fetch;

const prevKey = process.env.OPENWEATHER_API_KEY;
beforeAll(() => {
  process.env.OPENWEATHER_API_KEY = 'test-key';
});
afterAll(() => {
  global.fetch = originalFetch;
  if (prevKey !== undefined) process.env.OPENWEATHER_API_KEY = prevKey;
  else delete process.env.OPENWEATHER_API_KEY;
});
beforeEach(() => {
  jest.clearAllMocks();
});

const jsonResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});

describe('GET /api/weather/forecast', () => {
  it('returns 400 for missing coordinates without calling upstream', async () => {
    const req = new NextRequest('http://localhost/api/weather/forecast');
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 400 for out-of-range coordinates', async () => {
    const req = new NextRequest('http://localhost/api/weather/forecast?lat=200&lon=0');
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('collapses an upstream 401 to a 502 and never leaks the upstream status', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ cod: 401, message: 'Invalid API key' }, false, 401));

    const req = new NextRequest('http://localhost/api/weather/forecast?lat=37.77&lon=-122.42');
    const res = await GET(req);

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('Forecast service temporarily unavailable');
    // The raw upstream 401 must not reach the client body.
    expect(JSON.stringify(body)).not.toContain('401');
  });

  it('returns forecast data with a Cache-Control header on success', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ list: [], city: { name: 'San Francisco' } }));

    const req = new NextRequest('http://localhost/api/weather/forecast?lat=37.77&lon=-122.42');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers['Cache-Control']).toMatch(/s-maxage=600/);
    const body = await res.json();
    expect(body.city.name).toBe('San Francisco');
  });
});

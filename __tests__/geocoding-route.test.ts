/**
 * Unit tests for /api/weather/geocoding route (Open-Meteo + Zippopotam + Nominatim).
 *
 * Validates that the keyless geocoding pipeline returns the legacy
 * GeocodingResponse shape expected by existing callers.
 */

// Mock Next.js modules before importing the route.
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

// Mock rate limiter to always allow.
jest.mock('@/lib/services/weather-rate-limiter', () => ({
  rateLimitRequest: jest.fn().mockResolvedValue({
    allowed: true,
    headers: { 'X-RateLimit-Remaining': '99' },
  }),
}));

import { GET } from '@/app/api/weather/geocoding/route';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';
import { NextRequest } from 'next/server';

const originalFetch = global.fetch;
const mockFetch = jest.fn();
global.fetch = mockFetch as typeof global.fetch;

afterAll(() => {
  global.fetch = originalFetch;
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

describe('GET /api/weather/geocoding', () => {
  it('returns 400 when no parameters are provided', async () => {
    const req = new NextRequest('http://localhost/api/weather/geocoding');
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(rateLimitRequest).toHaveBeenCalledWith(expect.anything(), 'weather');
    const body = await res.json();
    expect(body.error).toMatch(/Missing required parameter/);
  });

  describe('direct search (?q=)', () => {
    it('resolves "City, ST" via Open-Meteo and filters by state abbreviation', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          results: [
            // First result is in a different state — should be filtered out.
            {
              id: 1,
              name: 'San Ramon',
              latitude: 13.25,
              longitude: 123.36,
              country_code: 'PH',
              admin1: 'Camarines Sur',
            },
            {
              id: 2,
              name: 'San Ramon',
              latitude: 37.78,
              longitude: -121.98,
              country_code: 'US',
              admin1: 'California',
            },
          ],
        })
      );

      const req = new NextRequest(
        'http://localhost/api/weather/geocoding?q=San%20Ramon,%20CA&limit=1'
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        name: 'San Ramon',
        country: 'US',
        state: 'CA',
      });
      expect(body[0].lat).toBeCloseTo(37.78);
      expect(body[0].lon).toBeCloseTo(-121.98);
    });

    it('maps UK results and accepts the UK alias for GB', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              id: 3,
              name: 'London',
              latitude: 51.51,
              longitude: -0.13,
              country_code: 'GB',
              admin1: 'England',
            },
          ],
        })
      );

      const req = new NextRequest(
        'http://localhost/api/weather/geocoding?q=London,%20UK'
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body[0]).toMatchObject({
        name: 'London',
        country: 'GB',
      });
    });

    it('returns 404 when Open-Meteo has no results', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }));

      const req = new NextRequest('http://localhost/api/weather/geocoding?q=Zzzzzzz');
      const res = await GET(req);
      expect(res.status).toBe(404);
    });

    it('returns 502 when Open-Meteo upstream errors', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, false, 500));

      const req = new NextRequest('http://localhost/api/weather/geocoding?q=Anywhere');
      const res = await GET(req);
      expect(res.status).toBe(502);
    });

    it('rejects coordinate-shaped q= with 400 instead of forwarding to upstream', async () => {
      const req = new NextRequest(
        'http://localhost/api/weather/geocoding?q=37.7497%2C-121.9547&limit=1'
      );
      const res = await GET(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/lat\/lon/);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // Regression coverage for the ZIP fast-path added when /api/geocode was
  // consolidated into this route. A bare 5-digit q= is a US ZIP, which
  // Open-Meteo's name search cannot resolve, so it must route through
  // Zippopotam and return an ARRAY (matching the direct-search contract the
  // Add-Location modal depends on — distinct from ?zip= which returns one object).
  describe('direct search ZIP fast-path (?q=<zip>)', () => {
    it('resolves a bare US ZIP via Zippopotam and returns an array', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          'post code': '94105',
          country: 'United States',
          'country abbreviation': 'US',
          places: [
            {
              'place name': 'San Francisco',
              longitude: '-122.3892',
              latitude: '37.7864',
              state: 'California',
              'state abbreviation': 'CA',
            },
          ],
        })
      );

      const req = new NextRequest('http://localhost/api/weather/geocoding?q=94105&limit=1');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ name: 'San Francisco', country: 'US', state: 'CA' });
      // Hit Zippopotam, not the Open-Meteo name endpoint.
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(String(mockFetch.mock.calls[0][0])).toContain('zippopotam.us/us/94105');
    });

    it('falls back to Open-Meteo direct search when the ZIP is not in Zippopotam', async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse({}, false, 404)) // Zippopotam miss
        .mockResolvedValueOnce(
          jsonResponse({
            results: [
              { id: 1, name: '94105', latitude: 37.79, longitude: -122.39, country_code: 'US', admin1: 'California' },
            ],
          })
        );

      const req = new NextRequest('http://localhost/api/weather/geocoding?q=94105&limit=1');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      // Tried Zippopotam first, then fell through to the name search.
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('ZIP lookup (?zip=)', () => {
    it('resolves a US ZIP via Zippopotam and returns a single object', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          'post code': '94583',
          country: 'United States',
          'country abbreviation': 'US',
          places: [
            {
              'place name': 'San Ramon',
              longitude: '-121.9736',
              latitude: '37.7772',
              state: 'California',
              'state abbreviation': 'CA',
            },
          ],
        })
      );

      const req = new NextRequest(
        'http://localhost/api/weather/geocoding?zip=94583,US'
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(false);
      expect(body).toMatchObject({
        name: 'San Ramon',
        country: 'US',
        state: 'CA',
        postcode: '94583',
      });
      expect(body.lat).toBeCloseTo(37.7772);
      expect(body.lon).toBeCloseTo(-121.9736);
    });

    it('returns 404 for unknown US ZIP', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, false, 404));

      const req = new NextRequest(
        'http://localhost/api/weather/geocoding?zip=00000'
      );
      const res = await GET(req);
      expect(res.status).toBe(404);
    });

    it('rejects non-numeric US ZIP', async () => {
      const req = new NextRequest(
        'http://localhost/api/weather/geocoding?zip=ABCDE'
      );
      const res = await GET(req);
      expect(res.status).toBe(404);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('falls back to Nominatim for international postal codes', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse([
          {
            lat: '51.5014',
            lon: '-0.1419',
            address: {
              city: 'London',
              state: 'England',
              country: 'United Kingdom',
              country_code: 'gb',
              postcode: 'SW1A 2AA',
            },
          },
        ])
      );

      const req = new NextRequest(
        'http://localhost/api/weather/geocoding?zip=SW1A%202AA,GB'
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        name: 'London',
        country: 'GB',
      });
      // Nominatim User-Agent header must be sent
      const lastCall = mockFetch.mock.calls[0];
      expect(lastCall[1]?.headers?.['User-Agent']).toBeDefined();
    });
  });

  describe('reverse lookup (?lat=&lon=)', () => {
    it('resolves coordinates via Nominatim and returns an array of one', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          lat: '37.7772',
          lon: '-121.9736',
          address: {
            city: 'San Ramon',
            state: 'California',
            country: 'United States',
            country_code: 'us',
            postcode: '94583',
          },
        })
      );

      const req = new NextRequest(
        'http://localhost/api/weather/geocoding?lat=37.7772&lon=-121.9736'
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        name: 'San Ramon',
        country: 'US',
        state: 'CA',
        postcode: '94583',
      });
      expect(body[0].lat).toBeCloseTo(37.7772);
      expect(body[0].lon).toBeCloseTo(-121.9736);
    });

    it('returns 400 for invalid coordinates', async () => {
      const req = new NextRequest(
        'http://localhost/api/weather/geocoding?lat=abc&lon=def'
      );
      const res = await GET(req);
      expect(res.status).toBe(400);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns 502 when Nominatim errors', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}, false, 500));

      const req = new NextRequest(
        'http://localhost/api/weather/geocoding?lat=37.7&lon=-121.9'
      );
      const res = await GET(req);
      expect(res.status).toBe(502);
    });
  });

  it('resolves place search without any third-party weather API key', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        results: [
          {
            id: 10,
            name: 'Paris',
            latitude: 48.85,
            longitude: 2.35,
            country_code: 'FR',
            admin1: 'Île-de-France',
          },
        ],
      })
    );

    const req = new NextRequest('http://localhost/api/weather/geocoding?q=Paris');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

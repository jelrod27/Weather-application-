/**
 * Unit tests for Open-Meteo forecast API route
 */

// Mock Next.js modules before importing
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

// Mock the rate limiter
jest.mock('@/lib/services/weather-rate-limiter', () => ({
  rateLimitRequest: jest.fn().mockResolvedValue({
    allowed: true,
    headers: { 'X-RateLimit-Remaining': '99' },
  }),
}));

// Mock the open-meteo service
jest.mock('@/lib/open-meteo', () => ({
  fetchOpenMeteoForecast: jest.fn(),
}));

import { GET } from '@/app/api/open-meteo/forecast/route';
import { fetchOpenMeteoForecast } from '@/lib/open-meteo';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';
import { NextRequest } from 'next/server';

const mockedFetch = fetchOpenMeteoForecast as jest.MockedFunction<typeof fetchOpenMeteoForecast>;
const mockedRateLimit = rateLimitRequest as jest.MockedFunction<typeof rateLimitRequest>;

describe('GET /api/open-meteo/forecast', () => {
  it.each([['us', 'US'], ['US', 'US'], ['CA', undefined], ['invalid', undefined]])('allows regional selection only for country_code=%s', async (country, expected) => {
    mockedFetch.mockResolvedValueOnce({ latitude: 37.66, longitude: -121.87 } as never);
    const res = await GET(new NextRequest(`http://localhost/api/open-meteo/forecast?lat=37.66&lon=-121.87&country_code=${country}`));
    expect(res.status).toBe(200);
    expect(mockedFetch).toHaveBeenCalledWith(37.66, -121.87, expect.objectContaining({ countryCode: expected }));
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRateLimit.mockResolvedValue({
      allowed: true,
      headers: { 'X-RateLimit-Remaining': '99' },
    } as any);
  });

  it('should return 400 when lat/lon are missing', async () => {
    const req = new NextRequest('http://localhost/api/open-meteo/forecast');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing required parameters: lat, lon');
  });

  it('should return forecast data for valid coordinates', async () => {
    const mockData = { latitude: 40.71, longitude: -74.01, timezone: 'America/New_York' };
    mockedFetch.mockResolvedValueOnce(mockData as any);

    const req = new NextRequest('http://localhost/api/open-meteo/forecast?lat=40.71&lon=-74.01');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.latitude).toBe(40.71);
    expect(mockedFetch).toHaveBeenCalledWith(40.71, -74.01, {
      forecastDays: 7,
      temperatureUnit: 'fahrenheit',
      windSpeedUnit: 'mph',
      precipitationUnit: 'inch',
    });
  });

  it('should return 400 for invalid coordinates', async () => {
    const req = new NextRequest('http://localhost/api/open-meteo/forecast?lat=abc&lon=def');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid coordinates provided');
  });

  it('should return 400 for out-of-range coordinates', async () => {
    const req = new NextRequest('http://localhost/api/open-meteo/forecast?lat=91&lon=0');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Coordinates out of valid range');
  });

  it('should return 502 when upstream service fails', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('Open-Meteo down'));

    const req = new NextRequest('http://localhost/api/open-meteo/forecast?lat=40.71&lon=-74.01');
    const res = await GET(req);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('Weather service unavailable');
  });

  it('should clamp forecast days between 1 and 16', async () => {
    const mockData = { latitude: 40.71, longitude: -74.01 };
    mockedFetch.mockResolvedValueOnce(mockData as any);

    const req = new NextRequest('http://localhost/api/open-meteo/forecast?lat=40.71&lon=-74.01&days=30');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockedFetch).toHaveBeenCalledWith(40.71, -74.01, {
      forecastDays: 16,
      temperatureUnit: 'fahrenheit',
      windSpeedUnit: 'mph',
      precipitationUnit: 'inch',
    });
  });
});

it('keeps the weather response usable if optional Moon calculation fails', async () => {
  mockedFetch.mockResolvedValueOnce({ latitude: 40, longitude: -74, timezone: 'invalid-zone' } as never)
  const res = await GET(new NextRequest('http://localhost/api/open-meteo/forecast?lat=40&lon=-74'))
  expect(res.status).toBe(200)
  expect(await res.json()).toMatchObject({ latitude: 40, moonPhase: null })
})

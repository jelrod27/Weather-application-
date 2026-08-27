/**
 * Unit tests for /api/aviation/alerts.
 *
 * Pins the Batch 4 refactor: the route now delegates to
 * aviation-noaa-service.fetchAviationAlertsFromNOAA and must keep the
 * { alerts, timestamp, source, count } client contract, and degrade to an
 * empty list (not throw) if the service throws.
 */

jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string
    nextUrl: { pathname: string; searchParams: URLSearchParams }
    constructor(url: string) {
      this.url = url
      this.nextUrl = { pathname: new URL(url).pathname, searchParams: new URL(url).searchParams }
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
  rateLimitRequest: jest.fn().mockResolvedValue({
    allowed: true,
    headers: {},
  }),
}));

jest.mock('@/lib/services/aviation-noaa-service', () => ({
  fetchAviationAlertsFromNOAA: jest.fn(),
}));

import { GET } from '@/app/api/aviation/alerts/route';
import { fetchAviationAlertsFromNOAA } from '@/lib/services/aviation-noaa-service';
import { NextRequest } from 'next/server';

const mockFetchAlerts = fetchAviationAlertsFromNOAA as jest.MockedFunction<
  typeof fetchAviationAlertsFromNOAA
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/aviation/alerts', () => {
  it('returns the alerts envelope with a count and cache header', async () => {
    mockFetchAlerts.mockResolvedValueOnce([
      {
        id: 'sigmet-1',
        type: 'SIGMET',
        severity: 'severe',
        hazard: 'Turbulence',
        region: 'KZAB',
        validFrom: '2026-06-01 12:00Z',
        validTo: '2026-06-01 16:00Z',
        text: 'Turbulence from FL240 to FL400',
        rawText: 'RAW',
      },
    ]);

    const res = await GET(new NextRequest('http://localhost/api/aviation/alerts'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe('NOAA Aviation Weather Center');
    expect(body.count).toBe(1);
    expect(body.alerts).toHaveLength(1);
    expect(body.alerts[0]).toMatchObject({ type: 'SIGMET', severity: 'severe' });
    expect(res.headers['Cache-Control']).toMatch(/s-maxage=300/);
  });

  it('degrades to an empty list with an error field if the service throws', async () => {
    mockFetchAlerts.mockRejectedValueOnce(new Error('NOAA exploded'));

    const res = await GET(new NextRequest('http://localhost/api/aviation/alerts'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.alerts).toEqual([]);
    expect(body.count).toBe(0);
    expect(body.error).toMatch(/Unable to fetch live data/);
    // The detailed upstream error must not leak to the client.
    expect(JSON.stringify(body)).not.toContain('NOAA exploded');
  });
});

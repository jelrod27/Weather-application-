/**
 * Unit tests for Travel Corridors API Route
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

jest.mock('@/lib/services/travel-corridor-service', () => ({ ...jest.requireActual('@/lib/services/travel-corridor-service'), fetchWeatherForWaypoints: jest.fn() }));
import { fetchWeatherForWaypoints } from '@/lib/services/travel-corridor-service';
import { GET } from '@/app/api/travel/corridors/route';
import { NextRequest } from 'next/server';

describe('Travel Corridors API Route', () => {
  it('should export a GET handler', async () => {
    const mod = await import('@/app/api/travel/corridors/route');
    expect(typeof mod.GET).toBe('function');
  });

  it('should return 400 for invalid day param', async () => {
    const req = new NextRequest('http://localhost:3000/api/travel/corridors?day=5');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});


it('returns unknown coverage instead of clear conditions for missing corridor samples', async () => {
  jest.mocked(fetchWeatherForWaypoints).mockResolvedValue([]);
  const response = await GET(new NextRequest('http://localhost/api/travel/corridors?day=0'));
  const body = await response.json();
  expect(body.corridors.length).toBeGreaterThan(0);
  expect(body.corridors[0]).toMatchObject({ score: -1, level: 'unknown', hazard: 'Data unavailable', worstPoint: null, coverage: { available: 0 } });
  expect(body.worstCorridors).toHaveLength(5);
});

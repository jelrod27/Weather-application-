jest.mock('next/server', () => ({
  NextRequest: class { constructor(public url: string) {} },
  NextResponse: { json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
    status: init?.status ?? 200, headers: new Headers(init?.headers), json: async () => body,
  }) },
}));
jest.mock('@/lib/api/with-api-route', () => ({
  withApiRoute: (_request: unknown, handler: (context: unknown) => unknown) => handler({ rateLimitHeaders: { 'X-RateLimit-Remaining': '19' } }),
}));
jest.mock('@/lib/error-utils', () => ({ logRouteError: jest.fn() }));
jest.mock('@/lib/services/aviation-turbulence-service', () => ({ fetchTurbulenceAdvisories: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/aviation/turbulence/route';
import { fetchTurbulenceAdvisories } from '@/lib/services/aviation-turbulence-service';

it('returns normalized data and bounded CDN caching', async () => {
  jest.mocked(fetchTurbulenceAdvisories).mockResolvedValue({ polygons: [], status: 'empty', fetchedAt: '2026-10-04T23:00:00Z',
    source: 'NOAA AWC G-AIRMET', coverage: 'CONUS', rejectedRecords: 0, unavailableForecastHours: [] });
  const response = await GET(new NextRequest('http://localhost/api/aviation/turbulence'));
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=300');
  expect(response.headers.get('X-RateLimit-Remaining')).toBe('19');
  expect(await response.json()).toMatchObject({ success: true, data: { coverage: 'CONUS', status: 'empty' } });
});

it('reports unavailable without caching or exposing upstream details', async () => {
  jest.mocked(fetchTurbulenceAdvisories).mockRejectedValue(new Error('private upstream error'));
  const response = await GET(new NextRequest('http://localhost/api/aviation/turbulence'));
  expect(response.status).toBe(502);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(response.headers.get('X-RateLimit-Remaining')).toBe('19');
  const body = await response.json();
  expect(body).toMatchObject({ success: false, data: { status: 'unavailable', fetchedAt: null } });
  expect(JSON.stringify(body)).not.toContain('private upstream');
});

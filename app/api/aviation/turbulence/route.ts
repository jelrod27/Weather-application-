import { NextResponse } from 'next/server';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logRouteError } from '@/lib/error-utils';
import { fetchTurbulenceAdvisories } from '@/lib/services/aviation-turbulence-service';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    try {
      const data = await fetchTurbulenceAdvisories();
      return NextResponse.json({ success: true, data }, {
        headers: { ...rateLimitHeaders, 'Cache-Control': 'public, s-maxage=300' },
      });
    } catch (error) {
      logRouteError('aviation-turbulence', error);
      return NextResponse.json({
        success: false,
        error: 'Turbulence advisories are unavailable. Please try again.',
        data: { polygons: [], source: 'NOAA AWC G-AIRMET', coverage: 'CONUS', status: 'unavailable', fetchedAt: null },
      }, { status: 502, headers: { ...rateLimitHeaders, 'Cache-Control': 'no-store' } });
    }
  }, { context: 'aviation-turbulence' });
}

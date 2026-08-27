import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export const revalidate = 86400;

const CELESTRAK_ISS_URL =
  'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const res = await fetchWithTimeout(CELESTRAK_ISS_URL, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      console.error('[TLE Proxy] CelesTrak HTTP error:', res.status);
      return NextResponse.json(
        { error: 'Failed to fetch TLE data from CelesTrak' },
        { status: 502, headers: rateLimitHeaders },
      );
    }

    const text = await res.text();

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
          ...rateLimitHeaders,
      },
    });
  } catch (error) {
    logRouteError('TLE Proxy', error);
    return NextResponse.json(
      { error: 'Internal server error fetching TLE data' },
      { status: 500 },
    );
  }
  }, { rateLimitBucket: 'content', context: 'TLE Proxy' });
}

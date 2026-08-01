import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    try {
      const hex = request.nextUrl.searchParams.get('hex')?.trim().toLowerCase() ?? '';
      if (!/^[0-9a-f]{6}$/.test(hex)) {
        return NextResponse.json(
          { error: 'hex must be a 6-char ICAO24' },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      const res = await fetchWithTimeout(
        `https://api.planespotters.net/pub/photos/hex/${hex}`,
        { timeoutMs: 8_000, maxRetries: 1, headers: { Accept: 'application/json' } },
      );

      if (!res.ok) {
        return NextResponse.json(
          { photos: [], error: `Photo upstream ${res.status}` },
          { status: 502, headers: rateLimitHeaders },
        );
      }

      const data = await res.json();
      return NextResponse.json(data, {
        headers: {
          ...rateLimitHeaders,
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        },
      });
    } catch (err) {
      logRouteError('aviation/aircraft/photo', err);
      return NextResponse.json({ photos: [], error: 'Photo lookup failed' }, { status: 502 });
    }
  })
}

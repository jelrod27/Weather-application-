import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAircraftByCallsign } from '@/lib/aviation/aircraft-providers';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    try {
      const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
      if (!q) {
        return NextResponse.json(
          { error: 'Missing q (callsign)' },
          { status: 400, headers: rateLimitHeaders },
        );
      }

      const result = await getAircraftByCallsign(q);
      return NextResponse.json(
        {
          aircraft: result.aircraft,
          source: result.source,
          degraded: result.degraded,
          count: result.aircraft.length,
        },
        {
          headers: {
            ...rateLimitHeaders,
            'X-Aircraft-Source': result.source,
          },
        },
      );
    } catch (err) {
      logRouteError('aviation/aircraft/callsign', err);
      return NextResponse.json(
        { error: 'Callsign lookup failed', aircraft: [], count: 0, degraded: true },
        { status: 502 },
      );
    }
  })
}

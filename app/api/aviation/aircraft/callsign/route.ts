import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';
import { getAircraftByCallsign } from '@/lib/aviation/aircraft-providers';

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request);
    if (!rateLimit.allowed) return rateLimit.response;

    const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (!q) {
      return NextResponse.json(
        { error: 'Missing q (callsign)' },
        { status: 400, headers: rateLimit.headers },
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
          ...rateLimit.headers,
          'X-Aircraft-Source': result.source,
        },
      },
    );
  } catch (err) {
    console.error('[aviation/aircraft/callsign]', err);
    return NextResponse.json(
      { error: 'Callsign lookup failed', aircraft: [], count: 0, degraded: true },
      { status: 502 },
    );
  }
}

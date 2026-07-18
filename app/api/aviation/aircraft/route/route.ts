import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';
import { resolveRouteForCallsign } from '@/lib/aviation/resolve-route';

/**
 * Resolve callsign → origin/destination airports.
 * Uses vradarserver standing-data (reliable); routeset POST is broken/empty upstream.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request);
    if (!rateLimit.allowed) return rateLimit.response;

    const callsign = request.nextUrl.searchParams.get('callsign')?.trim().toUpperCase() ?? '';
    if (!callsign) {
      return NextResponse.json(
        { error: 'callsign is required' },
        { status: 400, headers: rateLimit.headers },
      );
    }

    const latRaw = request.nextUrl.searchParams.get('lat');
    const lonRaw = request.nextUrl.searchParams.get('lon');
    const hasCoords = latRaw != null && latRaw.trim() !== '' && lonRaw != null && lonRaw.trim() !== '';
    let lat: number | undefined;
    let lon: number | undefined;
    if (hasCoords) {
      const parsedLat = Number(latRaw);
      const parsedLon = Number(lonRaw);
      if (
        !Number.isFinite(parsedLat)
        || !Number.isFinite(parsedLon)
        || parsedLat < -90
        || parsedLat > 90
        || parsedLon < -180
        || parsedLon > 180
      ) {
        return NextResponse.json(
          { error: 'Invalid lat/lon' },
          { status: 400, headers: rateLimit.headers },
        );
      }
      lat = parsedLat;
      lon = parsedLon;
    }

    const resolved = await resolveRouteForCallsign(callsign, lat, lon);

    return NextResponse.json(
      {
        callsign: resolved.callsign,
        origin: resolved.origin,
        destination: resolved.destination,
        originAirport: resolved.originAirport,
        destinationAirport: resolved.destinationAirport,
        airportCodes: resolved.airportCodes,
        source: resolved.source,
      },
      {
        headers: {
          ...rateLimit.headers,
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      },
    );
  } catch (err) {
    console.error('[aviation/aircraft/route]', err);
    return NextResponse.json(
      { error: 'Route lookup failed', origin: null, destination: null },
      { status: 502 },
    );
  }
}

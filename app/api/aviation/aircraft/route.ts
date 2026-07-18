/**
 * Near-point live aircraft proxy (ADS-B).
 * Never call upstream ADS-B APIs from the browser.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';
import {
  clampRadiusNm,
  getAircraftNear,
} from '@/lib/aviation/aircraft-providers';
import {
  DEFAULT_AIRCRAFT_RADIUS_NM,
  MAX_AIRCRAFT_RADIUS_NM,
} from '@/lib/aviation/aircraft-types';

function parseCoord(value: string | null, name: string): number | null {
  if (value == null || value.trim() === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (name === 'lat' && (n < -90 || n > 90)) return null;
  if (name === 'lon' && (n < -180 || n > 180)) return null;
  return n;
}

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await rateLimitRequest(request);
    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    const { searchParams } = request.nextUrl;
    const lat = parseCoord(searchParams.get('lat'), 'lat');
    const lon = parseCoord(searchParams.get('lon'), 'lon');
    if (lat == null || lon == null) {
      return NextResponse.json(
        { error: 'Missing or invalid lat/lon' },
        { status: 400, headers: rateLimit.headers },
      );
    }

    const radiusRaw = searchParams.get('radius');
    const parsedRadius =
      radiusRaw == null || radiusRaw.trim() === ''
        ? DEFAULT_AIRCRAFT_RADIUS_NM
        : Number(radiusRaw);
    if (!Number.isFinite(parsedRadius) || parsedRadius <= 0) {
      return NextResponse.json(
        { error: 'Invalid radius' },
        { status: 400, headers: rateLimit.headers },
      );
    }
    const radiusNm = clampRadiusNm(parsedRadius);

    const result = await getAircraftNear(lat, lon, radiusNm);

    return NextResponse.json(
      {
        aircraft: result.aircraft,
        source: result.source,
        degraded: result.degraded,
        count: result.count,
        fetchedAt: result.fetchedAt,
        radiusNm,
        maxRadiusNm: MAX_AIRCRAFT_RADIUS_NM,
      },
      {
        headers: {
          ...rateLimit.headers,
          'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=2',
          'X-Aircraft-Source': result.source,
        },
      },
    );
  } catch (err) {
    console.error('[aviation/aircraft]', err);
    return NextResponse.json(
      {
        error: 'Unable to load live aircraft',
        degraded: true,
        aircraft: [],
        count: 0,
      },
      { status: 502 },
    );
  }
}

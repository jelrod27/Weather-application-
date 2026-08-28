/**
 * Trip Score API Route
 *
 * Answers: "I'm going from origin → destination — how miserable will the
 * weather make my trip?"
 *
 * Modes:
 *  - drive: matches the origin/destination pair to the nearest US interstate
 *    corridor and scores each waypoint along the segment with Open-Meteo data.
 *  - fly:   resolves both endpoints to major hub airports, scores them via
 *    METAR, and flags en-route SIGMET/AIRMET hazards near the great-circle
 *    midpoint as a synthetic "en-route" misery score.
 *
 * Composition lives in lib/services/trip-score-service.ts.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logRouteError } from '@/lib/error-utils';
import { withApiRoute } from '@/lib/api/with-api-route';
import {
  resolveEndpoint,
  computeDriveTripScore,
  computeFlyTripScore,
} from '@/lib/services/trip-score-service';

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const sp = request.nextUrl.searchParams;
    const origin = sp.get('origin');
    const destination = sp.get('destination');
    const mode = sp.get('mode');
    const dayParam = sp.get('day') ?? '0';

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Missing required parameters: origin and destination' },
        { status: 400, headers: rateLimitHeaders },
      );
    }

    if (mode !== 'fly' && mode !== 'drive') {
      return NextResponse.json(
        { error: 'mode must be "fly" or "drive"' },
        { status: 400, headers: rateLimitHeaders },
      );
    }

    if (!/^[012]$/.test(dayParam)) {
      return NextResponse.json(
        { error: 'day must be 0, 1, or 2' },
        { status: 400, headers: rateLimitHeaders },
      );
    }
    const forecastDay = Number(dayParam);

    const [resolvedOrigin, resolvedDest] = await Promise.all([
      resolveEndpoint(origin, mode === 'fly'),
      resolveEndpoint(destination, mode === 'fly'),
    ]);

    if (!resolvedOrigin || !resolvedDest) {
      return NextResponse.json(
        { error: 'Could not resolve origin/destination' },
        { status: 400, headers: rateLimitHeaders },
      );
    }

    if (mode === 'drive') {
      return computeDriveTripScore(resolvedOrigin, resolvedDest, forecastDay, request.signal);
    }
    return computeFlyTripScore(resolvedOrigin, resolvedDest);
  } catch (error) {
    logRouteError('trip-score', error);
    return NextResponse.json(
      { error: 'Failed to compute trip score' },
      { status: 500 },
    );
  }
  }, { context: 'trip-score' });
}

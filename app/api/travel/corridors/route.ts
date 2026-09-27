/**
 * Travel Corridors API Route
 *
 * Fetches weather data along major US interstate corridors using Open-Meteo,
 * scores driving conditions, and returns corridor severity data.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import {
  summarizeCorridor,
  getWorstCorridors,
  fetchWeatherForWaypoints,
  type CorridorResult,
} from '@/lib/services/travel-corridor-service';
import interstateData from '@/public/data/us-interstates.json';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

interface InterstateCorridorData {
  name: string;
  waypoints: number[][];
  path: number[][];
}

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const dayParam = request.nextUrl.searchParams.get('day') ?? '0';
    if (!/^[012]$/.test(dayParam)) {
      return NextResponse.json({ error: 'day must be 0, 1, or 2' }, { status: 400, headers: rateLimitHeaders });
    }
    const forecastDay = Number(dayParam);

    const corridors = (interstateData as { corridors: InterstateCorridorData[] }).corridors;

    // Each corridor batches its sample points in one provider request.
    const results = await Promise.all(
      corridors.map(async (corridor): Promise<CorridorResult & { path: number[][] }> => {
        try {
          const weatherData = await fetchWeatherForWaypoints(corridor.waypoints, forecastDay, {
            requestSignal: request.signal,
            userAgent: '16-Bit-Weather/travel-corridors',
          });

          return { ...summarizeCorridor(corridor.name, corridor.waypoints, weatherData), path: corridor.path };
        } catch (err) {
          logRouteError('Travel Corridors', err);
          return { ...summarizeCorridor(corridor.name, corridor.waypoints, []), path: corridor.path };
        }
      })
    );

    const worstCorridors = getWorstCorridors(results, 5);

    return NextResponse.json({
      corridors: results,
      worstCorridors,
      forecastDay,
      fetchedAt: new Date().toISOString(),
    }, {
      headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600',
          ...rateLimitHeaders,
      },
    });
  } catch (error) {
    logRouteError('Travel Corridors API', error);
    return NextResponse.json(
      { error: 'Failed to fetch corridor data' },
      { status: 500 }
    );
  }
  }, { context: 'Travel Corridors API' });
}

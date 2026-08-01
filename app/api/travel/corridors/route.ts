/**
 * Travel Corridors API Route
 *
 * Fetches weather data along major US interstate corridors using Open-Meteo,
 * scores driving conditions, and returns corridor severity data.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import {
  scoreWeatherSeverity,
  getSeverityLevel,
  getHazardDescription,
  getWorstCorridors,
  fetchWeatherForWaypoints,
  SEVERITY_COLORS,
  DEFAULT_WEATHER_CONDITIONS,
  type CorridorResult,
  type CorridorSegment,
} from '@/lib/services/travel-corridor-service';
import interstateData from '@/public/data/us-interstates.json';
import { logRouteError } from '@/lib/error-utils'

interface InterstateCorridorData {
  name: string;
  waypoints: number[][];
  path: number[][];
}

export async function GET(request: NextRequest) {
  try {
    const dayParam = request.nextUrl.searchParams.get('day') ?? '0';
    if (!/^[012]$/.test(dayParam)) {
      return NextResponse.json({ error: 'day must be 0, 1, or 2' }, { status: 400 });
    }
    const forecastDay = Number(dayParam);

    const corridors = (interstateData as { corridors: InterstateCorridorData[] }).corridors;

    // Fetch all corridors in parallel — 19 requests is well within Open-Meteo's rate limits
    const results = await Promise.all(
      corridors.map(async (corridor): Promise<CorridorResult & { path: number[][] }> => {
        try {
          const weatherData = await fetchWeatherForWaypoints(corridor.waypoints, forecastDay, {
            requestSignal: request.signal,
            userAgent: '16-Bit-Weather/travel-corridors',
          });

          const segments: CorridorSegment[] = corridor.waypoints.map((wp, idx) => {
            const conditions = weatherData[idx] || DEFAULT_WEATHER_CONDITIONS;
            const segScore = scoreWeatherSeverity(conditions);
            const segLevel = getSeverityLevel(segScore);
            return {
              lat: wp[0],
              lon: wp[1],
              score: segScore,
              level: segLevel,
              color: SEVERITY_COLORS[segLevel],
            };
          });

          const avgScore = segments.length > 0
            ? Math.round(segments.reduce((sum, s) => sum + s.score, 0) / segments.length)
            : 0;

          let worstIdx = 0;
          segments.forEach((s, i) => { if (s.score > segments[worstIdx].score) worstIdx = i; });
          const worstConditions = weatherData[worstIdx] || DEFAULT_WEATHER_CONDITIONS;

          const level = getSeverityLevel(avgScore);

          return {
            name: corridor.name,
            score: avgScore,
            level,
            color: SEVERITY_COLORS[level],
            hazard: getHazardDescription(worstConditions),
            segments,
            path: corridor.path,
          };
        } catch (err) {
          logRouteError('Travel Corridors', err);
          return {
            name: corridor.name,
            score: -1,
            level: 'green' as const,
            color: SEVERITY_COLORS.unknown,
            hazard: 'Data unavailable',
            segments: [],
            path: corridor.path,
          };
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
      },
    });
  } catch (error) {
    logRouteError('Travel Corridors API', error);
    return NextResponse.json(
      { error: 'Failed to fetch corridor data' },
      { status: 500 }
    );
  }
}

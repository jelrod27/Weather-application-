/**
 * 16-Bit Weather Platform - Earth Sciences / Earthquakes API Route
 *
 * Server-side proxy around the USGS earthquake service so the
 * /earth-sciences client never calls USGS directly. Accepts
 * `minMagnitude` (default 2.5) and `days` (default 7) query params.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import {
  fetchGlobalEarthquakes,
  type EarthquakeData,
} from '@/lib/services/usgs-earthquake';

export interface EarthquakesApiResponse {
  earthquakes: Array<
    Omit<EarthquakeData, 'time'> & { time: string }
  >;
  count: number;
  minMagnitude: number;
  days: number;
  error?: string;
}

const ALLOWED_MIN_MAGS = new Set([0, 2.5, 4.5, 6]);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const rawMin = parseFloat(searchParams.get('minMagnitude') ?? '2.5');
  const minMagnitude = ALLOWED_MIN_MAGS.has(rawMin) ? rawMin : 2.5;

  const rawDays = parseInt(searchParams.get('days') ?? '7', 10);
  const days = Number.isFinite(rawDays) && rawDays > 0 && rawDays <= 30 ? rawDays : 7;

  try {
    const data = await fetchGlobalEarthquakes(minMagnitude, days, 50);

    // Serialize Date -> string for the wire
    const earthquakes = data.recent.map((q) => ({
      ...q,
      time: q.time.toISOString(),
    }));

    const body: EarthquakesApiResponse = {
      earthquakes,
      count: earthquakes.length,
      minMagnitude,
      days,
      ...(data.error ? { error: data.error } : {}),
    };

    return NextResponse.json(body, {
      headers: {
        // USGS data moves on the order of minutes; mirror the 5-min service cache
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[Earth Sciences API] Earthquake fetch failed:', error);
    const body: EarthquakesApiResponse = {
      earthquakes: [],
      count: 0,
      minMagnitude,
      days,
      error: 'Failed to fetch earthquake data',
    };
    return NextResponse.json(body, { status: 500 });
  }
}

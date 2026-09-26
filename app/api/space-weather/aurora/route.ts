/**
 * 16-Bit Weather Platform - Aurora Forecast API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Provides aurora forecast image URLs and viewline predictions from NOAA SWPC
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { viewlineFor } from '@/lib/space-weather/kp-scale';
import { parsePlanetaryKpIndex } from '@/lib/services/swpc-kp';
import { fetchSwpc } from '@/lib/services/swpc-proxy';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export interface AuroraForecastData {
  timestamp: string;
  images: {
    northern: string;
    southern: string;
  };
  viewline: {
    latitude: number; // How far south aurora may be visible
    description: string;
  } | null;
  activity: 'quiet' | 'unsettled' | 'active' | 'minor_storm' | 'major_storm' | 'unavailable';
}

// Determine activity level from Kp
function getActivityLevel(kp: number): AuroraForecastData['activity'] {
  if (kp >= 7) return 'major_storm';
  if (kp >= 5) return 'minor_storm';
  if (kp >= 4) return 'active';
  if (kp >= 3) return 'unsettled';
  return 'quiet';
}

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    // Fetch current Kp index for viewline estimation
    const kpResponse = await fetchSwpc('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!kpResponse.ok) throw new Error('Live Kp unavailable');
    const current = parsePlanetaryKpIndex(await kpResponse.json()).current;
    const viewline = viewlineFor(current?.kp);
    if (!current || !viewline) throw new Error('Live Kp unavailable');
    const currentKp = current.kp;
    const activity = getActivityLevel(currentKp);

    // NOAA SWPC aurora forecast images (updated every 30 minutes)
    const result: AuroraForecastData = {
      timestamp: new Date().toISOString(),
      images: {
        northern: 'https://services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.png',
        southern: 'https://services.swpc.noaa.gov/images/aurora-forecast-southern-hemisphere.png',
      },
      viewline: {
        latitude: viewline.latitude,
        description: `Approximate northern viewing guidance: ${viewline.description}`,
      },
      activity,
    };

    return NextResponse.json({
      data: result,
      kpIndex: currentKp,
      source: 'NOAA SWPC imagery and Kp; approximate site viewing guidance',
    }, { headers: rateLimitHeaders });

  } catch (error) {
    logRouteError('space-weather/aurora', error);

    return NextResponse.json({
      data: {
        timestamp: new Date().toISOString(),
        images: {
          northern: 'https://services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.png',
          southern: 'https://services.swpc.noaa.gov/images/aurora-forecast-southern-hemisphere.png',
        },
        viewline: null,
        activity: 'unavailable' as const,
      },
      kpIndex: null,
      source: 'NOAA Space Weather Prediction Center',
      error: 'Unable to fetch live Kp data',
    }, { status: 500 });
  }
  }, { context: 'space-weather/aurora' });
}

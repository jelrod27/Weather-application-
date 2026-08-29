/**
 * 16-Bit Weather Platform - Space Weather Scales API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches NOAA Space Weather Scales (R, S, G) from SWPC
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchSwpc } from '@/lib/services/swpc-proxy';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

interface NOAAScalesResponse {
  '0': {
    DateStamp: string;
    TimeStamp: string;
    R: { Scale: string; Text: string };
    S: { Scale: string; Text: string };
    G: { Scale: string; Text: string };
  };
  '-1'?: {
    DateStamp: string;
    TimeStamp: string;
    R: { Scale: string; Text: string };
    S: { Scale: string; Text: string };
    G: { Scale: string; Text: string };
  };
}

export interface SpaceWeatherScales {
  timestamp: string;
  dateStamp: string;
  timeStamp: string;
  R: { scale: number; text: string; description: string };
  S: { scale: number; text: string; description: string };
  G: { scale: number; text: string; description: string };
}

// Scale descriptions
const R_DESCRIPTIONS: Record<number, string> = {
  0: 'No significant radio blackouts',
  1: 'Minor: Weak HF radio degradation on sunlit side',
  2: 'Moderate: Limited HF radio blackout on sunlit side',
  3: 'Strong: Wide area HF radio blackout',
  4: 'Severe: HF radio blackout on most of sunlit side',
  5: 'Extreme: Complete HF radio blackout on sunlit side',
};

const S_DESCRIPTIONS: Record<number, string> = {
  0: 'No significant solar radiation storms',
  1: 'Minor: Minor impacts on HF radio in polar regions',
  2: 'Moderate: Infrequent single-event upsets possible',
  3: 'Strong: Single-event upsets, noise in imaging systems',
  4: 'Severe: Elevated radiation for astronauts/aircraft',
  5: 'Extreme: Unavoidable high radiation exposure',
};

const G_DESCRIPTIONS: Record<number, string> = {
  0: 'No significant geomagnetic storms',
  1: 'Minor: Weak power grid fluctuations, aurora at high latitudes',
  2: 'Moderate: High-latitude power systems may have voltage alarms',
  3: 'Strong: Voltage corrections needed, aurora at ~50° latitude',
  4: 'Severe: Widespread voltage control problems, aurora at ~45° latitude',
  5: 'Extreme: Possible grid collapse, aurora visible at ~40° latitude',
};

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const response = await fetchSwpc('https://services.swpc.noaa.gov/products/noaa-scales.json', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`NOAA SWPC API error: ${response.status}`);
    }

    const data: NOAAScalesResponse = await response.json();

    // Parse current scales (index '0' is current)
    const current = data['0'];

    if (!current) {
      throw new Error('No current scale data available');
    }

    const rScale = parseInt(current.R?.Scale || '0', 10);
    const sScale = parseInt(current.S?.Scale || '0', 10);
    const gScale = parseInt(current.G?.Scale || '0', 10);

    const scales: SpaceWeatherScales = {
      timestamp: new Date().toISOString(),
      dateStamp: current.DateStamp,
      timeStamp: current.TimeStamp,
      R: {
        scale: rScale,
        text: current.R?.Text || 'None',
        description: R_DESCRIPTIONS[rScale] || R_DESCRIPTIONS[0],
      },
      S: {
        scale: sScale,
        text: current.S?.Text || 'None',
        description: S_DESCRIPTIONS[sScale] || S_DESCRIPTIONS[0],
      },
      G: {
        scale: gScale,
        text: current.G?.Text || 'None',
        description: G_DESCRIPTIONS[gScale] || G_DESCRIPTIONS[0],
      },
    };

    return NextResponse.json({
      scales,
      source: 'NOAA Space Weather Prediction Center',
    }, { headers: rateLimitHeaders });

  } catch (error) {
    logRouteError('space-weather/scales', error);

    return NextResponse.json({
      scales: {
        timestamp: new Date().toISOString(),
        dateStamp: '',
        timeStamp: '',
        R: { scale: 0, text: 'Unknown', description: 'Data unavailable' },
        S: { scale: 0, text: 'Unknown', description: 'Data unavailable' },
        G: { scale: 0, text: 'Unknown', description: 'Data unavailable' },
      },
      source: 'NOAA Space Weather Prediction Center',
      error: 'Unable to fetch live data',
    }, { status: 500 });
  }
  }, { context: 'space-weather/scales' });
}

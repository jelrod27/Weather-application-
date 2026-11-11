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
import { fetchSwpcJson } from '@/lib/services/swpc-proxy';
import { CURRENT_MAX_AGE_MS, isCurrentObservation } from '@/lib/space-weather/freshness'
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
    const data = await fetchSwpcJson<NOAAScalesResponse>('https://services.swpc.noaa.gov/products/noaa-scales.json', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 }, // Cache for 5 minutes
    }, payload => {
      const current = payload?.['0'];
      return !!current && isCurrentObservation(`${current.DateStamp}T${current.TimeStamp}Z`, CURRENT_MAX_AGE_MS.scales);
    });

    // Parse current scales (index '0' is current)
    const current = data['0'];

    if (!current) {
      throw new Error('No current scale data available');
    }

    if (!isCurrentObservation(`${current.DateStamp}T${current.TimeStamp}Z`, CURRENT_MAX_AGE_MS.scales)) {
      throw new Error('No fresh NOAA scales observation');
    }

    // Missing or malformed observations cannot establish a quiet zero.
    const parseScale = (value: unknown): number => {
      if (typeof value !== 'string' || !/^[0-5]$/.test(value)) {
        throw new Error('Invalid NOAA scale observation');
      }
      return Number(value);
    };
    const rScale = parseScale(current.R?.Scale);
    const sScale = parseScale(current.S?.Scale);
    const gScale = parseScale(current.G?.Scale);

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
      scales: null,
      source: 'NOAA Space Weather Prediction Center',
      error: 'Unable to fetch live data',
    }, { status: 500 });
  }
  }, { context: 'space-weather/scales' });
}

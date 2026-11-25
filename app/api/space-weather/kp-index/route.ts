/**
 * 16-Bit Weather Platform - Kp Index API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches Planetary K-index from NOAA SWPC
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchSwpcJson } from '@/lib/services/swpc-proxy';
import { parseKpForecast } from '@/lib/services/swpc-kp';
import { fetchKpObservations, KP_FORECAST_URL } from '@/lib/space-weather/kp'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export interface KpIndexData {
  timestamp: string;
  current: {
    value: number;
    timeTag: string;
    isEstimate?: true;
  } | null;
  recent: Array<{
    timeTag: string;
    kp: number;
  }>;
  forecast: {
    expected: number;
    maxExpected: number;
    /** Three-hour blocks the average covers, so a client can label the window. */
    blocks: number;
  } | null;
}

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const [kpResponse, forecastResponse] = await Promise.allSettled([
      fetchKpObservations(),
      fetchSwpcJson(KP_FORECAST_URL, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 900 },
      }),
    ]);

    const observations = kpResponse.status === 'fulfilled' ? kpResponse.value : null;

    let forecast: KpIndexData['forecast'] = null;
    if (forecastResponse.status === 'fulfilled') {
      try {
        forecast = parseKpForecast(forecastResponse.value);
      } catch (e) {
        logRouteError('kp-index', e);
      }
    }

    const result: KpIndexData = {
      timestamp: new Date().toISOString(),
      current: observations ? {
        value: observations.current.kp,
        timeTag: observations.current.timeTag,
        ...(observations.current.isEstimate ? { isEstimate: true } : {}),
      } : null,
      recent: observations?.recent ?? [],
      forecast,
    };

    if (!observations) {
      return NextResponse.json(
        {
          data: result,
          source: 'NOAA Space Weather Prediction Center',
          error: 'Unable to parse live Kp data',
        },
        { status: 502, headers: rateLimitHeaders },
      );
    }

    return NextResponse.json(
      {
        data: result,
        source: 'NOAA Space Weather Prediction Center',
      },
      { headers: rateLimitHeaders },
    );
  } catch (error) {
    logRouteError('kp-index', error);

    return NextResponse.json(
      {
        data: {
          timestamp: new Date().toISOString(),
          current: null,
          recent: [],
          forecast: null,
        },
        source: 'NOAA Space Weather Prediction Center',
        error: 'Unable to fetch live data',
      },
      { status: 500 },
    );
  }
  }, { context: 'kp-index' });
}

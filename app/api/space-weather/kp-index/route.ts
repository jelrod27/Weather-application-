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
import { parseKpForecast, parseCurrentKpIndex } from '@/lib/services/swpc-kp';
import { CURRENT_MAX_AGE_MS, isCurrentObservation } from '@/lib/space-weather/freshness'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export interface KpIndexData {
  timestamp: string;
  current: {
    value: number;
    timeTag: string;
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
      fetchSwpcJson('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {
        headers: { Accept: 'application/json' },
        next: { revalidate: 300 },
      }, payload => parseCurrentKpIndex(payload).current !== null),
      fetchSwpcJson('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json', {
        headers: { Accept: 'application/json' },
        next: { revalidate: 900 },
      }),
    ]);

    let currentKp = 0;
    let currentTimeTag = '';
    let recentKp: Array<{ timeTag: string; kp: number }> = [];
    let upstreamOk = false;

    if (kpResponse.status === 'fulfilled') {
      const parsed = parseCurrentKpIndex(kpResponse.value);
      if (parsed.current && isCurrentObservation(parsed.current.timeTag, CURRENT_MAX_AGE_MS.kp)) {
        upstreamOk = true;
        currentKp = parsed.current.kp;
        currentTimeTag = parsed.current.timeTag;
        recentKp = parsed.recent.filter(sample => isCurrentObservation(sample.timeTag, 24 * 60 * 60_000));
      }
    }

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
      current: upstreamOk ? { value: currentKp, timeTag: currentTimeTag } : null,
      recent: recentKp,
      forecast,
    };

    if (!upstreamOk) {
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

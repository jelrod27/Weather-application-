/**
 * 16-Bit Weather Platform - Kp Index API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches Planetary K-index from NOAA SWPC
 */

import { NextResponse } from 'next/server';
import { fetchSwpc } from '@/lib/services/swpc-proxy';
import { parseKpForecast, parsePlanetaryKpIndex } from '@/lib/services/swpc-kp';
import { logRouteError } from '@/lib/error-utils'

export interface KpIndexData {
  timestamp: string;
  current: {
    value: number;
    timeTag: string;
  };
  recent: Array<{
    timeTag: string;
    kp: number;
  }>;
  forecast: {
    expected: number;
    maxExpected: number;
  } | null;
}

export async function GET() {
  try {
    const [kpResponse, forecastResponse] = await Promise.allSettled([
      fetchSwpc('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {
        headers: { Accept: 'application/json' },
        next: { revalidate: 300 },
      } as RequestInit),
      fetchSwpc('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json', {
        headers: { Accept: 'application/json' },
        next: { revalidate: 900 },
      } as RequestInit),
    ]);

    let currentKp = 0;
    let currentTimeTag = '';
    let recentKp: Array<{ timeTag: string; kp: number }> = [];
    let upstreamOk = false;

    if (kpResponse.status === 'fulfilled' && kpResponse.value.ok) {
      const kpData = await kpResponse.value.json();
      const parsed = parsePlanetaryKpIndex(kpData);
      if (parsed.current) {
        upstreamOk = true;
        currentKp = parsed.current.kp;
        currentTimeTag = parsed.current.timeTag;
        recentKp = parsed.recent;
      }
    }

    let forecast: KpIndexData['forecast'] = null;
    if (forecastResponse.status === 'fulfilled' && forecastResponse.value.ok) {
      try {
        const forecastData = await forecastResponse.value.json();
        forecast = parseKpForecast(forecastData);
      } catch (e) {
        logRouteError('kp-index', e);
      }
    }

    const result: KpIndexData = {
      timestamp: new Date().toISOString(),
      current: {
        value: currentKp,
        timeTag: currentTimeTag,
      },
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
        { status: 502 },
      );
    }

    return NextResponse.json({
      data: result,
      source: 'NOAA Space Weather Prediction Center',
    });
  } catch (error) {
    logRouteError('kp-index', error);

    return NextResponse.json(
      {
        data: {
          timestamp: new Date().toISOString(),
          current: { value: 0, timeTag: '' },
          recent: [],
          forecast: null,
        },
        source: 'NOAA Space Weather Prediction Center',
        error: 'Unable to fetch live data',
      },
      { status: 500 },
    );
  }
}

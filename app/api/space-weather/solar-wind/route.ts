/**
 * 16-Bit Weather Platform - Solar Wind API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches real-time solar wind data from NOAA SWPC RTSW JSON feeds.
 */

import { NextResponse } from 'next/server';
import { fetchSwpc } from '@/lib/services/swpc-proxy';
import {
  parseRtswSolarWind,
  RTSW_MAG_URL,
  RTSW_WIND_URL,
  type SolarWindCurrent,
} from '@/lib/services/swpc-solar-wind';

export interface SolarWindData {
  timestamp: string;
  current: SolarWindCurrent;
  trend: 'increasing' | 'decreasing' | 'stable';
  recent: Array<{
    timeTag: string;
    speed: number;
    density: number;
    bz: number;
  }>;
}

export async function GET() {
  try {
    const [plasmaResponse, magResponse] = await Promise.allSettled([
      fetchSwpc(RTSW_WIND_URL, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
      }),
      fetchSwpc(RTSW_MAG_URL, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
      }),
    ]);

    const windJson =
      plasmaResponse.status === 'fulfilled' && plasmaResponse.value.ok
        ? await plasmaResponse.value.json()
        : null;
    const magJson =
      magResponse.status === 'fulfilled' && magResponse.value.ok
        ? await magResponse.value.json()
        : null;

    const parsed = parseRtswSolarWind(windJson, magJson);

    const result: SolarWindData = {
      timestamp: new Date().toISOString(),
      current: parsed.current,
      trend: parsed.trend,
      recent: parsed.recent,
    };

    if (!parsed.available) {
      return NextResponse.json(
        {
          data: result,
          source: 'NOAA Space Weather Prediction Center (RTSW)',
          error: 'Unable to fetch live solar wind data',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      data: result,
      source: 'NOAA Space Weather Prediction Center (RTSW)',
    });
  } catch (error) {
    console.error('[solar-wind]', error);

    return NextResponse.json(
      {
        data: {
          timestamp: new Date().toISOString(),
          current: { speed: 0, density: 0, temperature: 0, bz: 0, bt: 0 },
          trend: 'stable' as const,
          recent: [],
        },
        source: 'NOAA Space Weather Prediction Center',
        error: 'Unable to fetch live data',
      },
      { status: 500 },
    );
  }
}

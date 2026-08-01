/**
 * 16-Bit Weather Platform - Magnetometer API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches GOES magnetometer data (Hp parallel component) from NOAA SWPC
 */

import { NextResponse } from 'next/server';
import { fetchSwpcJson } from '@/lib/services/swpc-proxy';
import { logRouteError } from '@/lib/error-utils'

export interface MagnetometerEntry {
  time: string;
  hp: number;
}

export async function GET() {
  try {
    const data = await fetchSwpcJson<Array<{
      time_tag: string;
      satellite: string;
      He: number;
      Hp: number;
      Hn: number;
      total: number;
    }>>('https://services.swpc.noaa.gov/json/goes/primary/magnetometers-1-day.json');

    const series: MagnetometerEntry[] = [];

    for (const entry of data) {
      const hp = entry.Hp;
      if (hp == null || isNaN(hp)) continue;

      series.push({
        time: entry.time_tag,
        hp: Math.round(hp * 100) / 100,
      });
    }

    return NextResponse.json(
      {
        data: series,
        source: 'NOAA Space Weather Prediction Center (GOES)',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    logRouteError('Magnetometer', error);

    return NextResponse.json(
      { error: 'Failed to fetch magnetometer data' },
      { status: 500 }
    );
  }
}

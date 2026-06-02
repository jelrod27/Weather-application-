/**
 * 16-Bit Weather Platform - Solar Wind Plasma & Magnetic Field API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Consolidates 7-day solar wind plasma and magnetic field time series from NOAA SWPC
 */

import { type NextRequest, NextResponse } from 'next/server';
import { fetchSwpc } from '@/lib/services/swpc-proxy';

export interface PlasmaEntry {
  time: string;
  speed: number;
  density: number;
  temperature: number;
  bz: number;
  by: number;
  bx: number;
  bt: number;
}

const RANGE_MS: Record<string, number> = {
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '2h': 2 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const range = searchParams.get('range') || '6h';
    const rangeMs = RANGE_MS[range] ?? RANGE_MS['6h'];

    // Each request gets its own bounded timeout via fetchSwpc, so a slow mag
    // feed no longer aborts the plasma feed (and vice versa), and the body
    // reads below stay bounded by their request's timeout.
    const [plasmaResponse, magResponse] = await Promise.allSettled([
      fetchSwpc('https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json'),
      fetchSwpc('https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json'),
    ]);

    // Build a map of mag data keyed by time_tag
    const magMap = new Map<string, { bx: number; by: number; bz: number; bt: number }>();

    if (magResponse.status === 'fulfilled' && magResponse.value.ok) {
      const magData = await magResponse.value.json();
      // Columns: [time_tag, bx_gsm, by_gsm, bz_gsm, lon_gsm, lat_gsm, bt]
      if (Array.isArray(magData) && magData.length > 1) {
        const rows = magData.slice(1);
        for (const row of rows) {
          if (!Array.isArray(row) || row.length < 7) continue;
          const bx = parseFloat(row[1] as string);
          const by = parseFloat(row[2] as string);
          const bz = parseFloat(row[3] as string);
          const bt = parseFloat(row[6] as string);
          if (isNaN(bx) || isNaN(by) || isNaN(bz) || isNaN(bt)) continue;
          magMap.set(row[0] as string, { bx, by, bz, bt });
        }
      }
    }

    const series: PlasmaEntry[] = [];
    const now = Date.now();
    const cutoff = now - rangeMs;

    if (plasmaResponse.status === 'fulfilled' && plasmaResponse.value.ok) {
      const plasmaData = await plasmaResponse.value.json();
      // Columns: [time_tag, density, speed, temperature]
      if (Array.isArray(plasmaData) && plasmaData.length > 1) {
        const rows = plasmaData.slice(1);
        for (const row of rows) {
          if (!Array.isArray(row) || row.length < 4) continue;

          const timeTag = row[0] as string;
          const entryTime = new Date(timeTag).getTime();
          if (isNaN(entryTime) || entryTime < cutoff) continue;

          const density = parseFloat(row[1] as string);
          const speed = parseFloat(row[2] as string);
          const temperature = parseFloat(row[3] as string);

          if (isNaN(density) || isNaN(speed) || isNaN(temperature)) continue;

          const mag = magMap.get(timeTag);
          if (!mag) continue;

          series.push({
            time: timeTag,
            speed: Math.round(speed),
            density: Math.round(density * 100) / 100,
            temperature: Math.round(temperature),
            bz: Math.round(mag.bz * 100) / 100,
            by: Math.round(mag.by * 100) / 100,
            bx: Math.round(mag.bx * 100) / 100,
            bt: Math.round(mag.bt * 100) / 100,
          });
        }
      }
    }

    return NextResponse.json(
      {
        data: series,
        range,
        source: 'NOAA Space Weather Prediction Center (DSCOVR/ACE)',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('[Plasma]', error);

    return NextResponse.json(
      { error: 'Failed to fetch solar wind plasma data' },
      { status: 500 }
    );
  }
}

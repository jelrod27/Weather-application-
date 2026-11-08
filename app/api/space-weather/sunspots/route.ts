/**
 * 16-Bit Weather Platform - Sunspot Data API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches solar cycle and sunspot data from NOAA SWPC
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchSwpcJson } from '@/lib/services/swpc-proxy';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export interface SunspotData {
  timestamp: string;
  current: { sunspotNumber: number; observedF107: number | null; date: string; period: 'monthly' };
  monthlySmoothed: number | null;
  smoothedDate: string | null;
}
interface SunspotRecord {
  'time-tag'?: string;
  ssn?: number;
  'f10.7'?: number;
  smoothed_ssn?: number;
}
const validValue = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const data = await fetchSwpcJson<SunspotRecord[]>('https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 }, // Monthly observations
    });

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No sunspot data available');
    }

    // This product contains monthly means, with -1 marking unavailable fields.
    const currentMonth = new Date().toISOString().slice(0, 7);
    const dated = data.filter(entry => entry && typeof entry['time-tag'] === 'string'
      && /^\d{4}-(0[1-9]|1[0-2])$/.test(entry['time-tag']) && entry['time-tag'] < currentMonth)
      .sort((a, b) => a['time-tag']!.localeCompare(b['time-tag']!));
    const currentEntry = dated.filter(entry => validValue(entry.ssn)).at(-1);
    if (!currentEntry) throw new Error('No valid monthly sunspot observation');
    const smoothed = dated.filter(entry => validValue(entry.smoothed_ssn)).at(-1);
    const result: SunspotData = {
      timestamp: new Date().toISOString(),
      current: {
        sunspotNumber: currentEntry.ssn!,
        observedF107: validValue(currentEntry['f10.7']) ? currentEntry['f10.7'] : null,
        date: currentEntry['time-tag']!,
        period: 'monthly',
      },
      monthlySmoothed: smoothed?.smoothed_ssn ?? null,
      smoothedDate: smoothed?.['time-tag'] ?? null,
    };

    return NextResponse.json({
      data: result,
      source: 'NOAA Space Weather Prediction Center',
    }, { headers: rateLimitHeaders });

  } catch (error) {
    logRouteError('space-weather/sunspots', error);

    return NextResponse.json({
      data: null,
      source: 'NOAA Space Weather Prediction Center',
      error: 'Unable to fetch live data',
    }, { status: 500 });
  }
  }, { context: 'space-weather/sunspots' });
}

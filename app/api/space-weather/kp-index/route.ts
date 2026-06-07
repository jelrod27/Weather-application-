/**
 * 16-Bit Weather Platform - Kp Index API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches Planetary K-index from NOAA SWPC
 */

import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { parseKpEntry, parseKpRow } from '@/lib/stargazer/space-environment';

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
    // Fetch both current Kp index and forecast
    const [kpResponse, forecastResponse] = await Promise.allSettled([
      fetchWithTimeout('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 } // Cache for 5 minutes
      } as RequestInit),
      fetchWithTimeout('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json', {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 900 } // Cache for 15 minutes
      } as RequestInit)
    ]);

    // Parse Kp index data. NOAA ships this in two shapes over time: array-of-objects
    // ({ time_tag, Kp, ... }) and the legacy array-of-arrays with a header row. The
    // shared parsers handle both and skip any non-numeric header/junk rows.
    let currentKp = 0;
    let currentTimeTag = '';
    const recentKp: Array<{ timeTag: string; kp: number }> = [];

    if (kpResponse.status === 'fulfilled' && kpResponse.value.ok) {
      const kpData = await kpResponse.value.json();

      if (Array.isArray(kpData) && kpData.length > 0) {
        // Last 8 numeric entries (24 hours of 3-hour intervals)
        const entries = kpData
          .map(parseKpEntry)
          .filter((e): e is { timeTag: string; kp: number } => e != null);
        const last8 = entries.slice(-8);
        recentKp.push(...last8);

        // Current is the last entry
        if (recentKp.length > 0) {
          const last = recentKp[recentKp.length - 1];
          currentKp = last.kp;
          currentTimeTag = last.timeTag;
        }
      }
    }

    // Parse forecast data
    let forecast: KpIndexData['forecast'] = null;
    if (forecastResponse.status === 'fulfilled' && forecastResponse.value.ok) {
      try {
        const forecastData = await forecastResponse.value.json();
        // Forecast mixes recent observed rows with predicted ones. Prefer the
        // predicted rows (the actual forecast); fall back to the tail otherwise.
        if (Array.isArray(forecastData) && forecastData.length > 0) {
          const predicted = forecastData.filter(
            (r) => r && typeof r === 'object' && (r as Record<string, unknown>).observed === 'predicted',
          );
          const source = predicted.length > 0 ? predicted : forecastData;
          const upcoming = source.slice(0, 8); // Next ~24 hours
          let maxKp = 0;
          let sumKp = 0;
          let count = 0;

          for (const row of upcoming) {
            const kp = parseKpRow(row);
            if (kp != null) {
              maxKp = Math.max(maxKp, kp);
              sumKp += kp;
              count++;
            }
          }

          if (count > 0) {
            forecast = {
              expected: Math.round(sumKp / count * 10) / 10,
              maxExpected: maxKp,
            };
          }
        }
      } catch (e) {
        console.error('Error parsing Kp forecast:', e);
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

    return NextResponse.json({
      data: result,
      source: 'NOAA Space Weather Prediction Center',
    });

  } catch (error) {
    console.error('Kp Index API error:', error);

    return NextResponse.json({
      data: {
        timestamp: new Date().toISOString(),
        current: { value: 0, timeTag: '' },
        recent: [],
        forecast: null,
      },
      source: 'NOAA Space Weather Prediction Center',
      error: 'Unable to fetch live data',
    }, { status: 500 });
  }
}

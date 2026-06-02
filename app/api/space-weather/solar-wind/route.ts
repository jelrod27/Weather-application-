/**
 * 16-Bit Weather Platform - Solar Wind API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches real-time solar wind data from NOAA SWPC
 */

import { NextResponse } from 'next/server';
import { fetchSwpc } from '@/lib/services/swpc-proxy';

export interface SolarWindData {
  timestamp: string;
  current: {
    speed: number; // km/s
    density: number; // particles/cm³
    temperature: number; // K
    bz: number; // nT (negative = southward = geomagnetically active)
    bt: number; // nT (total field)
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  recent: Array<{
    timeTag: string;
    speed: number;
    density: number;
    bz: number;
  }>;
}

// Determine trend from recent values
function determineTrend(values: number[]): SolarWindData['trend'] {
  if (values.length < 2) return 'stable';

  const first = values.slice(0, Math.floor(values.length / 2));
  const second = values.slice(Math.floor(values.length / 2));

  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
  const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;

  const diff = avgSecond - avgFirst;
  const threshold = avgFirst * 0.1; // 10% change threshold

  if (diff > threshold) return 'increasing';
  if (diff < -threshold) return 'decreasing';
  return 'stable';
}

export async function GET() {
  try {
    // Fetch plasma (speed, density, temp) and mag (Bz, Bt) data
    const [plasmaResponse, magResponse] = await Promise.allSettled([
      fetchSwpc('https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json', {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 }, // Cache for 1 minute
      }),
      fetchSwpc('https://services.swpc.noaa.gov/products/solar-wind/mag-1-day.json', {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 },
      }),
    ]);

    let currentSpeed = 0;
    let currentDensity = 0;
    let currentTemp = 0;
    let currentBz = 0;
    let currentBt = 0;
    const recent: SolarWindData['recent'] = [];
    const speedValues: number[] = [];

    // Parse plasma data: [time_tag, density, speed, temperature]
    if (plasmaResponse.status === 'fulfilled' && plasmaResponse.value.ok) {
      const plasmaData = await plasmaResponse.value.json();

      if (Array.isArray(plasmaData) && plasmaData.length > 1) {
        // Get last 6 hours of data (data comes in ~1 minute intervals)
        const dataRows = plasmaData.slice(1);
        const last360 = dataRows.slice(-360); // ~6 hours

        // Sample every 30 entries for recent array (to avoid too much data)
        for (let i = 0; i < last360.length; i += 30) {
          const row = last360[i];
          if (Array.isArray(row) && row.length >= 3) {
            const speed = parseFloat(row[2] as string) || 0;
            const density = parseFloat(row[1] as string) || 0;

            if (speed > 0) {
              recent.push({
                timeTag: row[0] as string,
                speed,
                density,
                bz: 0, // Will be filled from mag data
              });
              speedValues.push(speed);
            }
          }
        }

        // Current is the last valid entry
        for (let i = dataRows.length - 1; i >= 0; i--) {
          const row = dataRows[i];
          if (Array.isArray(row) && row.length >= 4) {
            const speed = parseFloat(row[2] as string);
            if (speed > 0) {
              currentSpeed = speed;
              currentDensity = parseFloat(row[1] as string) || 0;
              currentTemp = parseFloat(row[3] as string) || 0;
              break;
            }
          }
        }
      }
    }

    // Parse mag data: [time_tag, bx_gsm, by_gsm, bz_gsm, lon_gsm, lat_gsm, bt]
    if (magResponse.status === 'fulfilled' && magResponse.value.ok) {
      const magData = await magResponse.value.json();

      if (Array.isArray(magData) && magData.length > 1) {
        const dataRows = magData.slice(1);

        // Current Bz and Bt from last valid entry
        for (let i = dataRows.length - 1; i >= 0; i--) {
          const row = dataRows[i];
          if (Array.isArray(row) && row.length >= 7) {
            const bz = parseFloat(row[3] as string);
            const bt = parseFloat(row[6] as string);
            if (!isNaN(bz) && !isNaN(bt)) {
              currentBz = Math.round(bz * 10) / 10;
              currentBt = Math.round(bt * 10) / 10;
              break;
            }
          }
        }

        // Add Bz to recent data by sampling at 30-minute intervals
        const last360Mag = dataRows.slice(-360);
        for (let j = 0; j < recent.length; j++) {
          // Sample from mag data at 30-entry intervals to match solar wind sampling
          const rowIndex = Math.min(j * 30, last360Mag.length - 1);
          const row = last360Mag[rowIndex];
          if (Array.isArray(row) && row.length >= 4) {
            recent[j].bz = parseFloat(row[3] as string) || 0;
          }
        }
      }
    }

    const result: SolarWindData = {
      timestamp: new Date().toISOString(),
      current: {
        speed: Math.round(currentSpeed),
        density: Math.round(currentDensity * 10) / 10,
        temperature: Math.round(currentTemp),
        bz: currentBz,
        bt: currentBt,
      },
      trend: determineTrend(speedValues),
      recent: recent.slice(-12), // Keep last 12 data points
    };

    return NextResponse.json({
      data: result,
      source: 'NOAA Space Weather Prediction Center (DSCOVR/ACE)',
    });

  } catch (error) {
    console.error('Solar Wind API error:', error);

    return NextResponse.json({
      data: {
        timestamp: new Date().toISOString(),
        current: { speed: 0, density: 0, temperature: 0, bz: 0, bt: 0 },
        trend: 'stable' as const,
        recent: [],
      },
      source: 'NOAA Space Weather Prediction Center',
      error: 'Unable to fetch live data',
    }, { status: 500 });
  }
}

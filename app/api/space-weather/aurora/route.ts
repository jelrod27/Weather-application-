/**
 * 16-Bit Weather Platform - Aurora Forecast API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Provides aurora forecast image URLs and viewline predictions from NOAA SWPC
 */

import { NextResponse } from 'next/server';
import { fetchSwpc } from '@/lib/services/swpc-proxy';

export interface AuroraForecastData {
  timestamp: string;
  images: {
    northern: string;
    southern: string;
  };
  viewline: {
    latitude: number; // How far south aurora may be visible
    description: string;
  };
  activity: 'quiet' | 'unsettled' | 'active' | 'minor_storm' | 'major_storm';
}

// Estimate aurora visibility based on Kp index
function getViewlineFromKp(kp: number): { latitude: number; description: string } {
  // Approximate viewline latitudes by Kp
  const viewlines: Record<number, { lat: number; desc: string }> = {
    0: { lat: 66, desc: 'Far north latitudes only (66°N+)' },
    1: { lat: 64, desc: 'Northern Scandinavia, central Alaska (64°N+)' },
    2: { lat: 62, desc: 'Northern Scotland, southern Alaska (62°N+)' },
    3: { lat: 58, desc: 'Southern Scandinavia, northern US border (58°N+)' },
    4: { lat: 55, desc: 'Northern England, northern US states (55°N+)' },
    5: { lat: 50, desc: 'Central England, Oregon, Wisconsin (50°N+)' },
    6: { lat: 48, desc: 'Northern France, Washington state (48°N+)' },
    7: { lat: 45, desc: 'Southern France, northern California (45°N+)' },
    8: { lat: 42, desc: 'Northern Spain, central California (42°N+)' },
    9: { lat: 40, desc: 'Rare! Visible as far south as 40°N' },
  };

  const level = Math.min(9, Math.max(0, Math.round(kp)));
  const viewline = viewlines[level];

  return {
    latitude: viewline.lat,
    description: viewline.desc,
  };
}

// Determine activity level from Kp
function getActivityLevel(kp: number): AuroraForecastData['activity'] {
  if (kp >= 7) return 'major_storm';
  if (kp >= 5) return 'minor_storm';
  if (kp >= 4) return 'active';
  if (kp >= 3) return 'unsettled';
  return 'quiet';
}

export async function GET() {
  try {
    // Fetch current Kp index for viewline estimation
    const kpResponse = await fetchSwpc('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    let currentKp = 3; // Default moderate activity

    if (kpResponse.ok) {
      const kpData = await kpResponse.json();
      if (Array.isArray(kpData) && kpData.length > 1) {
        // Get most recent Kp value (last row, second column)
        const lastRow = kpData[kpData.length - 1];
        if (Array.isArray(lastRow) && lastRow.length >= 2) {
          currentKp = parseFloat(lastRow[1] as string) || 3;
        }
      }
    }

    const viewline = getViewlineFromKp(currentKp);
    const activity = getActivityLevel(currentKp);

    // NOAA SWPC aurora forecast images (updated every 30 minutes)
    const result: AuroraForecastData = {
      timestamp: new Date().toISOString(),
      images: {
        northern: 'https://services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.png',
        southern: 'https://services.swpc.noaa.gov/images/aurora-forecast-southern-hemisphere.png',
      },
      viewline: {
        latitude: viewline.latitude,
        description: viewline.description,
      },
      activity,
    };

    return NextResponse.json({
      data: result,
      kpIndex: currentKp,
      source: 'NOAA Space Weather Prediction Center (OVATION Model)',
    });

  } catch (error) {
    console.error('Aurora Forecast API error:', error);

    return NextResponse.json({
      data: {
        timestamp: new Date().toISOString(),
        images: {
          northern: 'https://services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.png',
          southern: 'https://services.swpc.noaa.gov/images/aurora-forecast-southern-hemisphere.png',
        },
        viewline: {
          latitude: 60,
          description: 'High latitudes (estimate)',
        },
        activity: 'quiet' as const,
      },
      kpIndex: 0,
      source: 'NOAA Space Weather Prediction Center',
      error: 'Unable to fetch live Kp data',
    }, { status: 500 });
  }
}

/**
 * 16-Bit Weather Platform - X-Ray Flux API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches GOES satellite X-ray flux data from NOAA SWPC
 */

import { NextResponse } from 'next/server';
import { fetchSwpc } from '@/lib/services/swpc-proxy';

export interface XRayFluxData {
  timestamp: string;
  current: {
    flux: number; // W/m²
    flareClass: string; // A, B, C, M, X
    classNumber: string; // e.g., "M2.4"
  };
  recent: Array<{
    timeTag: string;
    flux: number;
    flareClass: string;
  }>;
  peakLast24h: {
    flux: number;
    flareClass: string;
    timeTag: string;
  } | null;
}

// Convert flux value to flare classification
function getFlareClass(flux: number): { class: string; fullClass: string } {
  if (flux >= 1e-4) {
    const classNum = flux / 1e-4;
    return { class: 'X', fullClass: `X${classNum.toFixed(1)}` };
  }
  if (flux >= 1e-5) {
    const classNum = flux / 1e-5;
    return { class: 'M', fullClass: `M${classNum.toFixed(1)}` };
  }
  if (flux >= 1e-6) {
    const classNum = flux / 1e-6;
    return { class: 'C', fullClass: `C${classNum.toFixed(1)}` };
  }
  if (flux >= 1e-7) {
    const classNum = flux / 1e-7;
    return { class: 'B', fullClass: `B${classNum.toFixed(1)}` };
  }
  const classNum = flux / 1e-8;
  return { class: 'A', fullClass: `A${classNum.toFixed(1)}` };
}

export async function GET() {
  try {
    const response = await fetchSwpc('https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      throw new Error(`NOAA SWPC API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No X-ray flux data available');
    }

    // Parse data - entries have: time_tag, satellite, flux, observed_flux, etc.
    const recentData: XRayFluxData['recent'] = [];
    let currentFlux = 0;
    let currentTimeTag = '';
    let peakFlux = 0;
    let peakTimeTag = '';

    // Sample data every 15 entries (roughly every 15 minutes)
    for (let i = 0; i < data.length; i += 15) {
      const entry = data[i];
      if (entry && typeof entry.flux === 'number' && entry.flux > 0) {
        const { class: flareClass } = getFlareClass(entry.flux);
        recentData.push({
          timeTag: entry.time_tag || '',
          flux: entry.flux,
          flareClass,
        });

        // Track peak
        if (entry.flux > peakFlux) {
          peakFlux = entry.flux;
          peakTimeTag = entry.time_tag || '';
        }
      }
    }

    // Get most recent valid entry for current
    for (let i = data.length - 1; i >= 0; i--) {
      const entry = data[i];
      if (entry && typeof entry.flux === 'number' && entry.flux > 0) {
        currentFlux = entry.flux;
        currentTimeTag = entry.time_tag || '';
        break;
      }
    }

    const { class: currentClass, fullClass: currentFullClass } = getFlareClass(currentFlux);
    const { fullClass: peakFullClass } = getFlareClass(peakFlux);

    const result: XRayFluxData = {
      timestamp: new Date().toISOString(),
      current: {
        flux: currentFlux,
        flareClass: currentClass,
        classNumber: currentFullClass,
      },
      recent: recentData.slice(-48), // Keep last 48 data points (~12 hours)
      peakLast24h: peakFlux > 0 ? {
        flux: peakFlux,
        flareClass: peakFullClass,
        timeTag: peakTimeTag,
      } : null,
    };

    return NextResponse.json({
      data: result,
      source: 'NOAA Space Weather Prediction Center (GOES Satellite)',
    });

  } catch (error) {
    console.error('X-Ray Flux API error:', error);

    return NextResponse.json({
      data: {
        timestamp: new Date().toISOString(),
        current: { flux: 0, flareClass: 'A', classNumber: 'A0.0' },
        recent: [],
        peakLast24h: null,
      },
      source: 'NOAA Space Weather Prediction Center',
      error: 'Unable to fetch live data',
    }, { status: 500 });
  }
}

/**
 * 16-Bit Weather Platform - X-Ray Flux API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches GOES satellite X-ray flux data from NOAA SWPC
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchSwpcJson } from '@/lib/services/swpc-proxy';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

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

interface XRayReading {
  energy?: unknown;
  flux?: unknown;
  time_tag?: unknown;
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

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const data = await fetchSwpcJson<XRayReading[]>('https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No X-ray flux data available');
    }

    // SWPC returns both 0.05–0.4 nm and 0.1–0.8 nm values interleaved by
    // timestamp. NOAA's flare classes use the 0.1–0.8 nm band. Keep the
    // short-wavelength channel out of both the chart and flare summaries.
    const longWavelengthReadings = data.filter(
      (entry): entry is XRayReading & { flux: number; time_tag: string } =>
        entry?.energy === '0.1-0.8nm' &&
        typeof entry.flux === 'number' &&
        Number.isFinite(entry.flux) &&
        entry.flux > 0 &&
        typeof entry.time_tag === 'string' &&
        Number.isFinite(Date.parse(entry.time_tag)),
    );

    const recentData: XRayFluxData['recent'] = [];
    for (let i = 0; i < longWavelengthReadings.length; i += 15) {
      const entry = longWavelengthReadings[i];
      const { class: flareClass } = getFlareClass(entry.flux);
      recentData.push({ timeTag: entry.time_tag, flux: entry.flux, flareClass });
    }

    const current = longWavelengthReadings.at(-1);
    const currentFlux = current?.flux ?? 0;
    let peakFlux = 0;
    let peakTimeTag = '';
    for (const entry of longWavelengthReadings) {
      if (entry.flux > peakFlux) {
        peakFlux = entry.flux;
        peakTimeTag = entry.time_tag;
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
    }, { headers: rateLimitHeaders });

  } catch (error) {
    logRouteError('space-weather/xray-flux', error);

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
  }, { context: 'space-weather/xray-flux' });
}

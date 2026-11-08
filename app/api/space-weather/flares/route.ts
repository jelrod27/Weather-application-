/**
 * 16-Bit Weather Platform - NASA DONKI Solar Flare API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches Solar Flare data from NASA DONKI
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

const eventTime = z.string().refine(value => Number.isFinite(Date.parse(value)));
const flareCatalog = z.array(z.object({
  flrID: z.string().min(1),
  instruments: z.array(z.object({ displayName: z.string() })).nullish(),
  beginTime: eventTime,
  peakTime: eventTime,
  endTime: eventTime.nullish(),
  classType: z.string().regex(/^[ABCMX]\d+(?:\.\d+)?$/),
  sourceLocation: z.string().nullish(),
  activeRegionNum: z.number().nullish(),
  linkedEvents: z.array(z.object({ activityID: z.string() })).nullish(),
}));

interface FlareEvent {
  id: string;
  beginTime: string;
  peakTime: string;
  endTime: string;
  classification: string;
  classLetter: string;
  classNumber: number;
  sourceLocation: string;
  activeRegion: number | null;
  instruments: string[];
  linkedCME: boolean;
}

// Parse flare classification (e.g., "M5.2" -> { letter: "M", number: 5.2 })
function parseClassification(classType: string): { letter: string; number: number } {
  if (!classType) return { letter: 'A', number: 0 };
  const letter = classType.charAt(0).toUpperCase();
  const number = parseFloat(classType.slice(1)) || 0;
  return { letter, number };
}

// Get severity level for flare class
function getSeverity(classLetter: string): number {
  switch (classLetter) {
    case 'X': return 5;
    case 'M': return 4;
    case 'C': return 3;
    case 'B': return 2;
    case 'A': return 1;
    default: return 0;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    // NASA migrated its public DONKI API in September 2026. Use the direct
    // catalog rather than the api.nasa.gov gateway, which times out/503s.
    // https://ccmc.gsfc.nasa.gov/news/major-updates/
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - 7);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const url = `https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`;

    const response = await fetchWithTimeout(url, {
      timeoutMs: 4000,
      maxRetries: 1,
      maxBackoffMs: 500,
      next: { revalidate: 900 }, // Cache for 15 minutes
    });

    if (!response.ok) {
      throw new Error(`NASA API returned ${response.status}`);
    }

    const data = flareCatalog.parse(await response.json());

    // Transform the data
    const flareEvents: FlareEvent[] = data
      .map((flare) => {
        const { letter, number } = parseClassification(flare.classType);

        return {
          id: flare.flrID,
          beginTime: flare.beginTime,
          peakTime: flare.peakTime,
          endTime: flare.endTime || flare.peakTime,
          classification: flare.classType,
          classLetter: letter,
          classNumber: number,
          sourceLocation: flare.sourceLocation || 'Unknown',
          activeRegion: flare.activeRegionNum ?? null,
          instruments: flare.instruments?.map((i) => i.displayName) || [],
          linkedCME: flare.linkedEvents?.some((e) => e.activityID.includes('CME')) || false,
        };
      })
      .sort((a, b) => new Date(b.peakTime).getTime() - new Date(a.peakTime).getTime());

    // Count by class
    const byClass = {
      X: flareEvents.filter((f) => f.classLetter === 'X').length,
      M: flareEvents.filter((f) => f.classLetter === 'M').length,
      C: flareEvents.filter((f) => f.classLetter === 'C').length,
      B: flareEvents.filter((f) => f.classLetter === 'B').length,
    };

    // Find strongest flare
    const strongest = flareEvents.reduce((max, flare) => {
      const maxSeverity = getSeverity(max.classLetter) * 10 + max.classNumber;
      const flareSeverity = getSeverity(flare.classLetter) * 10 + flare.classNumber;
      return flareSeverity > maxSeverity ? flare : max;
    }, flareEvents[0] || { classification: 'None', classLetter: 'A', classNumber: 0 });

    // Summary statistics
    const summary = {
      total: flareEvents.length,
      byClass,
      strongestFlare: strongest?.classification || 'None',
      withCME: flareEvents.filter((f) => f.linkedCME).length,
    };

    return NextResponse.json({
      events: flareEvents.slice(0, 30), // Limit to most recent 30
      summary,
      updatedAt: new Date().toISOString(),
    }, { headers: rateLimitHeaders });
  } catch (error) {
    logRouteError('flares', error);

    // Return fallback data
    return NextResponse.json({
      events: [],
      summary: {
        total: 0,
        byClass: { X: 0, M: 0, C: 0, B: 0 },
        strongestFlare: 'None',
        withCME: 0,
      },
      updatedAt: new Date().toISOString(),
      error: 'NASA flare catalog temporarily unavailable. Please try again.',
    }, { status: 502, headers: rateLimitHeaders });
  }
  }, { context: 'flares' });
}

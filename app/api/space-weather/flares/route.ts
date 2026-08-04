/**
 * 16-Bit Weather Platform - NASA DONKI Solar Flare API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches Solar Flare data from NASA DONKI
 */

import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { logRouteError } from '@/lib/error-utils'

interface NasaFlare {
  flrID: string;
  instruments: { displayName: string }[];
  beginTime: string;
  peakTime: string;
  endTime: string;
  classType: string;
  sourceLocation: string;
  activeRegionNum: number | null;
  linkedEvents: { activityID: string }[] | null;
  link: string;
}

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

export async function GET() {
  try {
    // NASA DONKI API - free, no auth required for basic access
    // Get flares from last 7 days
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const apiKey = process.env.NASA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'NASA API key not configured', events: [], summary: { total: 0, byClass: { X: 0, M: 0, C: 0, B: 0 }, strongestFlare: 'None', withCME: 0 }, updatedAt: new Date().toISOString() },
        { status: 503 }
      );
    }
    // NASA DONKI requires the key as a query param (no header auth). Keep the
    // URL out of any log/Sentry payload so the key never leaks — the catch
    // below logs the error object, not the request URL.
    const url = `https://api.nasa.gov/DONKI/FLR?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}&api_key=${apiKey}`;

    const response = await fetchWithTimeout(url, {
      next: { revalidate: 900 }, // Cache for 15 minutes
    });

    if (!response.ok) {
      throw new Error(`NASA API returned ${response.status}`);
    }

    const raw = await response.json();
    const data: NasaFlare[] = Array.isArray(raw) ? raw : [];

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
          activeRegion: flare.activeRegionNum,
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
    });
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
      error: 'Failed to fetch flare data from NASA DONKI',
    }, { status: 500 });
  }
}

/**
 * 16-Bit Weather Platform - Sunspot Data API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Fetches solar cycle and sunspot data from NOAA SWPC
 */

import { NextResponse } from 'next/server';
import { fetchSwpc } from '@/lib/services/swpc-proxy';
import { logRouteError } from '@/lib/error-utils'

export interface SunspotData {
  timestamp: string;
  current: {
    sunspotNumber: number;
    observedF107: number; // Solar radio flux
    date: string;
  };
  solarCycle: {
    cycleNumber: number;
    phase: 'rising' | 'maximum' | 'declining' | 'minimum';
    percentComplete: number;
  };
  monthlySmoothed: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export async function GET() {
  try {
    const response = await fetchSwpc('https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 }, // Cache for 1 hour (daily data)
    });

    if (!response.ok) {
      throw new Error(`NOAA SWPC API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No sunspot data available');
    }

    // Find most recent entry with valid sunspot data
    let currentEntry = null;
    let monthlySmoothed = 0;

    // Data is sorted by date, get last few entries
    const recent = data.slice(-24); // Last 2 years of monthly data

    for (let i = recent.length - 1; i >= 0; i--) {
      const entry = recent[i];
      if (entry && typeof entry.ssn === 'number') {
        currentEntry = entry;
        break;
      }
    }

    if (!currentEntry) {
      throw new Error('No valid sunspot data found');
    }

    // Calculate smoothed average from recent 13 months
    const smoothedValues = recent
      .slice(-13)
      .filter(e => typeof e.ssn === 'number')
      .map(e => e.ssn);

    if (smoothedValues.length > 0) {
      monthlySmoothed = Math.round(smoothedValues.reduce((a, b) => a + b, 0) / smoothedValues.length);
    }

    // Determine trend from last 6 months
    const trendValues = recent
      .slice(-6)
      .filter(e => typeof e.ssn === 'number')
      .map(e => e.ssn);

    let trend: SunspotData['trend'] = 'stable';
    if (trendValues.length >= 2) {
      const firstHalf = trendValues.slice(0, Math.floor(trendValues.length / 2));
      const secondHalf = trendValues.slice(Math.floor(trendValues.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (avgSecond > avgFirst * 1.1) trend = 'increasing';
      else if (avgSecond < avgFirst * 0.9) trend = 'decreasing';
    }

    // Solar Cycle 25 started December 2019
    // Estimate phase based on sunspot count and time since start
    const cycleStartDate = new Date('2019-12-01');
    const currentDate = new Date(currentEntry['time-tag'] || Date.now());
    const monthsInCycle = (currentDate.getTime() - cycleStartDate.getTime()) / (30 * 24 * 60 * 60 * 1000);
    const percentComplete = Math.min(100, Math.round((monthsInCycle / 132) * 100)); // ~11 year cycle = 132 months

    let phase: SunspotData['solarCycle']['phase'] = 'rising';
    const sunspotCount = currentEntry.ssn || 0;

    // Solar max expected around 2024-2025 for Cycle 25
    // Order matters: check minimum before declining since >85 is subset of >55
    if (percentComplete >= 45 && percentComplete <= 55 && sunspotCount > 100) {
      phase = 'maximum';
    } else if (percentComplete > 85 || sunspotCount < 30) {
      phase = 'minimum';
    } else if (percentComplete > 55) {
      phase = 'declining';
    }

    const result: SunspotData = {
      timestamp: new Date().toISOString(),
      current: {
        sunspotNumber: Math.round(currentEntry.ssn || 0),
        observedF107: Math.round(currentEntry.f107_obs || currentEntry.f107 || 0),
        date: currentEntry['time-tag'] || '',
      },
      solarCycle: {
        cycleNumber: 25,
        phase,
        percentComplete,
      },
      monthlySmoothed,
      trend,
    };

    return NextResponse.json({
      data: result,
      source: 'NOAA Space Weather Prediction Center',
    });

  } catch (error) {
    logRouteError('space-weather/sunspots', error);

    return NextResponse.json({
      data: {
        timestamp: new Date().toISOString(),
        current: { sunspotNumber: 0, observedF107: 0, date: '' },
        solarCycle: { cycleNumber: 25, phase: 'rising' as const, percentComplete: 0 },
        monthlySmoothed: 0,
        trend: 'stable' as const,
      },
      source: 'NOAA Space Weather Prediction Center',
      error: 'Unable to fetch live data',
    }, { status: 500 });
  }
}

/**
 * 16-Bit Weather Platform - Flight Lookup API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Looks up flight routes by flight number (e.g., AA123) using a provider
 * abstraction (FlightAware AeroAPI with mock fallback). See
 * lib/services/flight-lookup-service.ts for fallback chain semantics.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';
import {
  lookupFlight,
  type AirlineData,
  type AirportData,
  type FlightStatus,
  type LivePosition,
} from '@/lib/services/flight-lookup-service';

export interface FlightLookupResponse {
  success: boolean;
  data?: {
    flightNumber: string;
    airline: AirlineData;
    departure: AirportData;
    arrival: AirportData;
    status: FlightStatus;
    livePosition?: LivePosition;
    /** True when route data is synthesized rather than from a live provider. */
    mock?: boolean;
    /** Which provider answered the request. */
    source?: 'aeroapi' | 'mock';
  };
  error?: string;
  errorCode?:
    | 'INVALID_FLIGHT_NUMBER'
    | 'FLIGHT_NOT_FOUND'
    | 'UNKNOWN_AIRLINE'
    | 'RATE_LIMITED'
    | 'API_ERROR';
}

export async function GET(request: NextRequest) {
  try {
    // Rate limit: this route is backed by paid FlightAware AeroAPI with a
    // monthly usage cap. Without a limiter, anonymous traffic can burn the
    // cap in minutes and degrade the feature to mock data for the month.
    const rateLimit = await rateLimitRequest(request);
    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    const { searchParams } = new URL(request.url);
    const flightParam = searchParams.get('flight');

    if (!flightParam) {
      return NextResponse.json<FlightLookupResponse>(
        {
          success: false,
          error: 'Flight number is required. Example: AA123, UA456',
          errorCode: 'INVALID_FLIGHT_NUMBER',
        },
        { status: 400 },
      );
    }

    const forceMock = searchParams.get('mock') === '1';
    const outcome = await lookupFlight(flightParam, { forceMock });

    if (!outcome.ok) {
      const status =
        outcome.error.code === 'INVALID_FLIGHT_NUMBER' ? 400 : 404;
      return NextResponse.json<FlightLookupResponse>(
        {
          success: false,
          error: outcome.error.message,
          errorCode: outcome.error.code,
        },
        { status },
      );
    }

    const { result } = outcome;
    return NextResponse.json<FlightLookupResponse>(
      {
        success: true,
        data: {
          flightNumber: result.flightNumber,
          airline: result.airline,
          departure: result.departure,
          arrival: result.arrival,
          status: result.status,
          livePosition: result.livePosition,
          mock: result.mock,
          source: result.source,
        },
      },
      {
        headers: {
          // Schedule data is fairly stable; let CDN cache as well — but only
          // for live-provider responses. Forced-mock responses are
          // user-driven and shouldn't be served from a shared cache.
          'Cache-Control': forceMock
            ? 'no-store'
            : 'public, s-maxage=600, stale-while-revalidate=1200',
          'X-Flight-Source': result.source,
        },
      },
    );
  } catch (error) {
    console.error('[API] Flight lookup error:', error);
    return NextResponse.json<FlightLookupResponse>(
      {
        success: false,
        error: 'Internal server error',
        errorCode: 'API_ERROR',
      },
      { status: 500 },
    );
  }
}

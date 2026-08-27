/**
 * 16-Bit Weather Platform - Aviation Alerts API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Serves SIGMET/AIRMET advisories from the NOAA Aviation Weather Center.
 * Parsing, fetch timeouts, and transient-abort handling all live in
 * lib/services/aviation-noaa-service so this HTTP route and the server-side
 * callers (airport-misery, trip-score) share one hardened implementation.
 * Previously this route carried its own copy of the parsing, including an
 * un-hardened mapSeverity that threw on non-string NOAA values.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchAviationAlertsFromNOAA } from '@/lib/services/aviation-noaa-service';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

const SOURCE = 'NOAA Aviation Weather Center';

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const alerts = await fetchAviationAlertsFromNOAA();
    return NextResponse.json(
      {
        alerts,
        timestamp: new Date().toISOString(),
        source: SOURCE,
        count: alerts.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
          ...rateLimitHeaders,
        },
      },
    );
  } catch (error) {
    logRouteError('aviation-alerts', error);

    // The service degrades to an empty list on upstream failure, so reaching
    // here means a genuine internal error — return 500 (not 200) so callers can
    // tell a real failure apart from a healthy all-clear, while still shaping
    // the body the client expects.
    return NextResponse.json(
      {
        alerts: [],
        timestamp: new Date().toISOString(),
        source: SOURCE,
        count: 0,
        error: 'Unable to fetch live data. Please try again later.',
      },
      { status: 500 }
    );
  }
  }, { context: 'aviation-alerts' });
}

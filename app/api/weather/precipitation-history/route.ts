/**
 * 16-Bit Weather Platform - v1.0.0
 *
 * Precipitation History API Route
 * Fetches 24-hour precipitation totals using Open-Meteo
 * Available for all users with 1-hour cache TTL
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createTtlCache } from '@/lib/cache/ttl-cache';
import { fetchOpenMeteoForecast } from '@/lib/open-meteo';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

// 15 minutes — precipitation changes fast during active rain.
const precipitationCache = createTtlCache<PrecipitationResponse>({ ttlMs: 15 * 60 * 1000 });

interface PrecipitationResponse {
  currentRain: number;
  currentSnow: number;
  rain24h: number;
  snow24h: number;
  todayRain: number;
  yesterdayRain: number;
  todaySnow: number;
  yesterdaySnow: number;
  lastUpdated: string;
  dataSource: 'day_summary' | 'timemachine';
  dataAvailable: boolean;
  dataQuality: 'full' | 'partial';
}

// Convert mm to inches
function mmToInches(mm: number): number {
  return Math.round((mm / 25.4) * 100) / 100;
}

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    try {
      // Check rate limit first

      const sp = request.nextUrl.searchParams;
      const lat = sp.get('lat');
      const lon = sp.get('lon');

      if (!lat || !lon) {
        return NextResponse.json(
          { error: 'Missing required parameters: lat, lon' },
          { status: 400 }
        );
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return NextResponse.json(
          { error: 'Invalid coordinates' },
          { status: 400 }
        );
      }

      // Check cache
      const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
      const cached = precipitationCache.get(cacheKey);

      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'private, max-age=900',
            ...rateLimitHeaders,
          },
        });
      }

      // Fetch from Open-Meteo with past_days=1 + forecast_days=1
      // This gives us yesterday + today in daily/hourly arrays (chronological order)
      // Hourly data spans yesterday midnight → today end, covering a full 24h rolling window
      const forecast = await fetchOpenMeteoForecast(latitude, longitude, {
        pastDays: 1,
        forecastDays: 1,
        temperatureUnit: 'fahrenheit',
        windSpeedUnit: 'mph',
        precipitationUnit: 'mm', // We convert to inches ourselves for precision
      });

      const current = forecast.current;
      const daily = forecast.daily;
      const hourly = forecast.hourly;

      // Current precipitation rate
      const currentPrecipMm = current?.precipitation ?? 0;
      const currentTempF = current?.temperature_2m ?? 40;
      const isSnow = currentTempF <= 32;

      const currentRain = isSnow ? 0 : mmToInches(currentPrecipMm);
      const currentSnow = isSnow ? mmToInches(currentPrecipMm) : 0;

      // Daily totals from Open-Meteo daily.precipitation_sum
      // With past_days=1, forecast_days=1: index 0 = yesterday, index 1 = today
      const yesterdayPrecipMm = daily?.precipitation_sum?.[0] ?? 0;
      const todayPrecipMm = daily?.precipitation_sum?.[1] ?? 0;

      // Determine snow vs rain for daily totals using daily temperature
      // If max temp is <= 32F, classify as snow
      const yesterdayMaxF = daily?.temperature_2m_max?.[0] ?? 40;
      const todayMaxF = daily?.temperature_2m_max?.[1] ?? 40;

      const todayIsSnow = todayMaxF <= 32;
      const yesterdayIsSnow = yesterdayMaxF <= 32;

      const todayRain = todayIsSnow ? 0 : mmToInches(todayPrecipMm);
      const todaySnow = todayIsSnow ? mmToInches(todayPrecipMm) : 0;
      const yesterdayRain = yesterdayIsSnow ? 0 : mmToInches(yesterdayPrecipMm);
      const yesterdaySnow = yesterdayIsSnow ? mmToInches(yesterdayPrecipMm) : 0;

      // Calculate true rolling 24h precipitation total from hourly data
      // With past_days=1, hourly data spans yesterday midnight → today end
      //
      // TIMEZONE FIX: Open-Meteo returns local wall-clock times (no UTC offset)
      // when timezone=auto. Parse with 'Z' suffix to treat as UTC, then subtract
      // the location's utc_offset_seconds to get the true UTC epoch.
      const now = new Date();
      const utcOffsetMs = (forecast.utc_offset_seconds ?? 0) * 1000;
      let hourly24hPrecipMm = 0;
      let hourlySnow24hMm = 0;
      let hourlySamplesInWindow = 0;

      if (hourly?.time && hourly?.precipitation) {
        const nowMs = now.getTime();
        const oneDayAgo = nowMs - 24 * 60 * 60 * 1000;
        for (let i = 0; i < hourly.time.length; i++) {
          // Convert location-local timestamp to true UTC epoch
          const hourMs = new Date(hourly.time[i] + 'Z').getTime() - utcOffsetMs;
          if (hourMs >= oneDayAgo && hourMs <= nowMs) {
            const precipMm = hourly.precipitation[i] ?? 0;
            // Per-hour snow classification using hourly temperature if available
            const hourTempF = hourly.temperature_2m?.[i];
            const hourIsSnow = hourTempF != null ? hourTempF <= 32 : currentTempF <= 32;
            if (hourIsSnow) {
              hourlySnow24hMm += precipMm;
            } else {
              hourly24hPrecipMm += precipMm;
            }
            hourlySamplesInWindow++;
          }
        }
      }

      // Require near-full coverage (22+ of 24 hours) to trust hourly rolling sum.
      // With past_days=1 we get 48 hours of data, so this should almost always pass.
      const hourlyHasFullCoverage = hourlySamplesInWindow >= 22;

      let rain24h: number;
      let snow24h: number;

      if (hourlyHasFullCoverage) {
        // Primary path: true rolling 24h sum from hourly data
        rain24h = mmToInches(hourly24hPrecipMm);
        snow24h = mmToInches(hourlySnow24hMm);
      } else {
        // Fallback: sum daily totals (conservative — may slightly overcount)
        rain24h = todayRain + yesterdayRain;
        snow24h = todaySnow + yesterdaySnow;
      }

      const dataAvailable = daily?.time != null && daily.time.length > 0;

      const precipitationData: PrecipitationResponse = {
        currentRain,
        currentSnow,
        rain24h,
        snow24h,
        todayRain,
        yesterdayRain,
        todaySnow,
        yesterdaySnow,
        lastUpdated: new Date().toISOString(),
        dataSource: 'day_summary',
        dataAvailable,
        dataQuality: hourlyHasFullCoverage ? 'full' : 'partial',
      };

      // Only cache successful responses
      if (dataAvailable) {
        precipitationCache.set(cacheKey, precipitationData);
      }

      return NextResponse.json(precipitationData, {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'private, max-age=900',
          ...rateLimitHeaders,
        },
      });

    } catch (error) {
      logRouteError('Precipitation API', error);
      return NextResponse.json(
        { error: 'Failed to fetch precipitation data' },
        { status: 500 }
      );
    }
  })
}

/**
 * 16-Bit Weather Platform - Air Quality API v0.4.0
 * 
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 * 
 * Primary: Open-Meteo Air Quality API (free, no key required)
 * Reference: https://open-meteo.com/en/docs/air-quality-api
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import { fetchOpenMeteoAirQuality } from '@/lib/open-meteo'
import { parseCoordinates } from '@/lib/api/query-params'

const CACHE_DURATION = 3600; // 1 hour (Open-Meteo updates hourly)

export async function GET(request: NextRequest) {
  try {
    // Check rate limit first
    const rateLimit = await rateLimitRequest(request)
    if (!rateLimit.allowed) {
      return rateLimit.response
    }

    // Extract and validate parameters
    const searchParams = request.nextUrl.searchParams
    const coords = parseCoordinates(searchParams.get('lat'), searchParams.get('lon'))

    if (!coords.ok) {
      return NextResponse.json(
        {
          error: coords.error,
          aqi: 0,
          category: 'No Data',
          source: 'error'
        },
        { status: 400 }
      )
    }

    const { latitude, longitude } = coords

    // Fetch from Open-Meteo Air Quality API
    const data = await fetchOpenMeteoAirQuality(latitude, longitude)
    const current = data.current

    if (current.us_aqi == null) {
      console.error('[air-quality] Open-Meteo returned no us_aqi value')
      return NextResponse.json(
        { error: 'Upstream air quality data incomplete' },
        { status: 502 }
      )
    }

    const aqiValue = current.us_aqi
    const category = getAQICategory(aqiValue)

    return NextResponse.json({
      aqi: aqiValue,
      category: category,
      source: 'open-meteo',
      pollutants: {
        pm2_5: current.pm2_5,
        pm10: current.pm10,
        ozone: current.ozone,
        nitrogen_dioxide: current.nitrogen_dioxide,
        sulphur_dioxide: current.sulphur_dioxide,
        carbon_monoxide: current.carbon_monoxide,
      },
      debug: {
        timestamp: new Date().toISOString(),
        dust: current.dust,
        uv_index: current.uv_index,
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate`,
        'X-AQI-Source': 'open-meteo',
        ...rateLimit.headers
      }
    })

  } catch (error: unknown) {
    console.error('[air-quality] Open-Meteo API error:', error);
    return NextResponse.json(
      { error: 'Air quality service temporarily unavailable' },
      { status: 502 }
    )
  }
}

// Get AQI category based on EPA scale
function getAQICategory(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}


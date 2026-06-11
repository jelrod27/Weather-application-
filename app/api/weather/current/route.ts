/**
 * 16-Bit Weather Platform - v1.0.0
 * 
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 * 
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { trackWeatherApiCall } from '@/lib/services/sentry-metrics'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { apiError } from '@/lib/api/error-response'
import { normalizeUnits } from '@/lib/api/query-params'

const BASE_URL = 'https://api.openweathermap.org/data/2.5'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Check rate limit first
    const rateLimit = await rateLimitRequest(request)
    if (!rateLimit.allowed) {
      return rateLimit.response
    }

    // Get API key from server-side environment
    const apiKey = process.env.OPENWEATHER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenWeather API key not configured' },
        { status: 500 }
      )
    }

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const units = normalizeUnits(searchParams.get('units'))

    // Validate required parameters
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat, lon' },
        { status: 400 }
      )
    }

    // Validate coordinates
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid coordinates provided' },
        { status: 400 }
      )
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of valid range' },
        { status: 400 }
      )
    }

    // Make request to OpenWeatherMap API
    const weatherUrl = `${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=${units}`

    const response = await fetchWithTimeout(weatherUrl)
    const responseTime = Date.now() - startTime

    if (!response.ok) {
      const errorData = await response.text()
      console.error('[current]', `upstream ${response.status}`, errorData)

      // Track failed API call
      trackWeatherApiCall('unknown', responseTime, false, 'current')

      return apiError('UPSTREAM_ERROR', 'Weather service unavailable', {
        details: { upstreamStatus: response.status },
      })
    }

    const weatherData = await response.json()

    // Track successful API call
    trackWeatherApiCall(weatherData.name || 'unknown', responseTime, true, 'current')

    // Return the weather data with cache + rate limit headers
    return NextResponse.json(weatherData, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
        ...rateLimit.headers,
      },
    })

  } catch (error) {
    const responseTime = Date.now() - startTime
    trackWeatherApiCall('unknown', responseTime, false, 'current')

    console.error('[current]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
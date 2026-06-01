/**
 * 16-Bit Weather Platform - v1.0.0
 * 
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 * 
 * Use Limitation: 5 users
 * See LICENSE file for full terms
 * 
 * BETA SOFTWARE NOTICE:
 * This software is in active development. Features may change.
 * Report issues: https://github.com/deephouse23/Weather-application-/issues
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

const BASE_URL_V3 = 'https://api.openweathermap.org/data/3.0'
const BASE_URL = 'https://api.openweathermap.org/data/2.5'

export async function GET(request: NextRequest) {
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

    // Try One Call API 3.0 first for real-time UV data
    try {
      const oneCallUrl = `${BASE_URL_V3}/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely,daily,alerts&appid=${apiKey}`

      // Single attempt with a bounded timeout; on any failure we fall back to
      // the basic UV endpoint below rather than retrying the primary.
      const response = await fetchWithTimeout(oneCallUrl, { maxRetries: 0 })
      
      if (response.ok) {
        const data = await response.json()
        const currentUV = data.current?.uvi || 0
        
        return NextResponse.json({
          uvi: currentUV,
          source: 'onecall_3.0'
        }, { headers: rateLimit.headers })
      }
    } catch {
      // One Call API 3.0 not available, trying fallback
    }

    // Fallback to basic UV endpoint (daily maximum)
    try {
      const uvUrl = `${BASE_URL}/uvi?lat=${latitude}&lon=${longitude}&appid=${apiKey}`

      const response = await fetchWithTimeout(uvUrl, { maxRetries: 0 })
      
      if (response.ok) {
        const data = await response.json()
        const dailyMaxUV = data.value || data.uvi || 0
        
        // Estimate current UV based on time of day
        const now = new Date()
        const hour = now.getHours()
        const currentUV = estimateCurrentUVFromDailyMax(dailyMaxUV, hour)
        
        return NextResponse.json({
          uvi: Math.round(currentUV),
          source: 'uvi_daily_estimated'
        }, { headers: rateLimit.headers })
      }
    } catch {
      // UV fallback API also failed
    }

    // If both fail, return 0
    return NextResponse.json({
      uvi: 0,
      source: 'unavailable'
    }, { headers: rateLimit.headers })

  } catch (error) {
    console.error('UV API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to estimate current UV from daily maximum based on time of day
function estimateCurrentUVFromDailyMax(dailyMaxUV: number, hour: number): number {
  // UV is typically highest around solar noon (12-2 PM)
  // This is a rough approximation based on typical UV patterns
  if (hour < 6 || hour > 18) return 0 // Nighttime
  
  // Create a bell curve approximation for UV throughout the day
  const peakHour = 13 // Peak UV around 1 PM
  const standardDeviation = 3 // Spread of the curve
  
  // Calculate how far we are from peak hour
  const distanceFromPeak = Math.abs(hour - peakHour)
  
  // Use a simplified normal distribution approximation
  const uvMultiplier = Math.exp(-(distanceFromPeak * distanceFromPeak) / (2 * standardDeviation * standardDeviation))
  
  const estimatedUV = dailyMaxUV * uvMultiplier
  
  return Math.max(0, estimatedUV)
}
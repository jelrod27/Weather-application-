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

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

const BASE_URL = 'https://api.openweathermap.org/data/2.5'

export async function GET(request: NextRequest) {
  try {
    // Check rate limit first
    const rateLimit = await rateLimitRequest(request)
    if (!rateLimit.allowed) {
      return rateLimit.response
    }

    // Get API keys from server-side environment
    const openWeatherApiKey = process.env.OPENWEATHER_API_KEY
    const googlePollenApiKey = process.env.GOOGLE_POLLEN_API_KEY
    
    if (!openWeatherApiKey) {
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

    // Try Google Pollen API first if available
    if (googlePollenApiKey) {
      try {
        const googlePollenUrl = `https://pollen.googleapis.com/v1/forecast:lookup?key=${googlePollenApiKey}&location.latitude=${latitude}&location.longitude=${longitude}&days=1`
        
        const response = await fetchWithTimeout(googlePollenUrl, { signal: request.signal })
        
        if (response.ok) {
          const data = await response.json()
          const dailyInfo = data.dailyInfo?.[0]
          
          if (dailyInfo) {
            // Helper function to convert pollen value to category
            const getPollenCategory = (value: number): string => {
              if (value === 0) return 'No Data'
              if (value <= 2) return 'Low'
              if (value <= 5) return 'Moderate'
              if (value <= 8) return 'High'
              return 'Very High'
            }

            // Plant code groupings
            const treePlants = ['MAPLE', 'ELM', 'COTTONWOOD', 'ALDER', 'BIRCH', 'ASH', 'PINE', 'OAK', 'JUNIPER']
            const grassPlants = ['GRAMINALES']
            const weedPlants = ['RAGWEED', 'WEED']

            interface PlantInfo {
              code?: string;
              displayName?: string;
              indexInfo?: {
                value?: number;
                category?: string;
              };
            }
            
            interface PollenTypeInfo {
              code?: string;
              indexInfo?: {
                value?: number;
                category?: string;
              };
            }

            // Helper to extract all plants of a group
            const extractPlantCategories = (plants: PlantInfo[], group: string[]): Record<string, string> => {
              const result: Record<string, string> = {}
              plants?.forEach((p) => {
                const code = p.code || p.displayName || ''
                if (group.some(type => code.includes(type))) {
                  const value = p.indexInfo?.value || 0
                  const category = p.indexInfo?.category || getPollenCategory(value)
                  result[p.displayName || code] = category
                }
              })
              return result
            }

            const plantInfo: PlantInfo[] = dailyInfo.plantInfo || []
            const treeBreakdown = extractPlantCategories(plantInfo, treePlants)
            const grassBreakdown = extractPlantCategories(plantInfo, grassPlants)
            const weedBreakdown = extractPlantCategories(plantInfo, weedPlants)

            // Fallback to pollenTypeInfo if no plantInfo for a group
            const pollenTypeTree: PollenTypeInfo | undefined = dailyInfo.pollenTypeInfo?.find((p: PollenTypeInfo) => p.code === 'TREE')
            const pollenTypeGrass: PollenTypeInfo | undefined = dailyInfo.pollenTypeInfo?.find((p: PollenTypeInfo) => p.code === 'GRASS')
            const pollenTypeWeed: PollenTypeInfo | undefined = dailyInfo.pollenTypeInfo?.find((p: PollenTypeInfo) => p.code === 'WEED')

            if (Object.keys(treeBreakdown).length === 0 && pollenTypeTree) {
              treeBreakdown['Tree'] = pollenTypeTree.indexInfo?.category || getPollenCategory(pollenTypeTree.indexInfo?.value || 0)
            }
            if (Object.keys(grassBreakdown).length === 0 && pollenTypeGrass) {
              grassBreakdown['Grass'] = pollenTypeGrass.indexInfo?.category || getPollenCategory(pollenTypeGrass.indexInfo?.value || 0)
            }
            if (Object.keys(weedBreakdown).length === 0 && pollenTypeWeed) {
              weedBreakdown['Weed'] = pollenTypeWeed.indexInfo?.category || getPollenCategory(pollenTypeWeed.indexInfo?.value || 0)
            }

            return NextResponse.json({
              tree: treeBreakdown,
              grass: grassBreakdown,
              weed: weedBreakdown,
              source: 'google'
            }, {
              headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
                ...rateLimit.headers,
              },
            })
          }
        }
      } catch {
        // Google Pollen API failed, trying fallback
      }
    }

    // Fallback to OpenWeather Air Pollution API for basic air quality data
    const airPollutionUrl = `${BASE_URL}/air_pollution?lat=${latitude}&lon=${longitude}&appid=${openWeatherApiKey}`
    
    const response = await fetchWithTimeout(airPollutionUrl, { signal: request.signal })
    
    if (!response.ok) {
      return NextResponse.json({
        tree: { 'Tree': 'No Data' },
        grass: { 'Grass': 'No Data' },
        weed: { 'Weed': 'No Data' },
        source: 'unavailable'
      }, { headers: rateLimit.headers })
    }

    const data = await response.json()
    
    // Use air quality as fallback (not seasonal estimates)
    const airQualityIndex = data.list?.[0]?.main?.aqi || 1
    
    const getPollenCategory = (value: number): string => {
      if (value === 0) return 'No Data'
      if (value <= 2) return 'Low'
      if (value <= 5) return 'Moderate'
      if (value <= 8) return 'High'
      return 'Very High'
    }
    
    return NextResponse.json({
      tree: { 'Tree': getPollenCategory(Math.min(Math.round(airQualityIndex * 10), 100)) },
      grass: { 'Grass': getPollenCategory(Math.min(Math.round(airQualityIndex * 8), 100)) },
      weed: { 'Weed': getPollenCategory(Math.min(Math.round(airQualityIndex * 6), 100)) },
      source: 'openweather_fallback'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        ...rateLimit.headers,
      },
    })

  } catch (error) {
    console.error('[pollen]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
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

/**
 * API Route for Temperature Extremes
 * Version 0.3.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { HOT_LOCATIONS, COLD_LOCATIONS, LOCATION_FACTS, LOCATION_DETAILS, HISTORICAL_AVERAGES, type LocationTemperature } from '@/lib/extremes/extremes-data';
import { parseOptionalLatLonQuery } from '@/lib/extremes/parse-query-coords';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter';

/**
 * Fetch temperature data for a specific location using server-side API
 */
async function fetchLocationTemperature(
  location: typeof HOT_LOCATIONS[0],
  apiKey: string
): Promise<LocationTemperature | null> {
  try {
    const response = await fetchWithTimeout(
      `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&units=imperial&appid=${apiKey}`,
      { next: { revalidate: 1800 } } // Cache for 30 minutes
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch ${location.name}:`, response.status);
      return null;
    }
    
    const data = await response.json();
    
    return {
      name: location.name,
      country: location.country,
      lat: location.lat,
      lon: location.lon,
      emoji: location.emoji,
      temp: Math.round(data.main.temp),
      tempC: Math.round((data.main.temp - 32) * 5/9),
      condition: data.weather[0].main,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed),
      fact: LOCATION_FACTS[location.name],
      // Travel detail panels on the extremes page render these fields
      // conditionally; they were dropped when this pipeline was extracted
      // from lib/extremes/extremes-data.ts, leaving the panels permanently
      // hidden. Populate them for locations with curated details.
      description: LOCATION_DETAILS[location.name]?.description,
      climateType: LOCATION_DETAILS[location.name]?.climateType,
      bestTime: LOCATION_DETAILS[location.name]?.bestTime,
      travelTip: LOCATION_DETAILS[location.name]?.travelTip,
      historicalAvg: HISTORICAL_AVERAGES[location.name],
      lastUpdated: Date.now()
    };
  } catch (error) {
    console.error(`Error fetching ${location.name}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limit: a cold-cache request fans out ~31 upstream OpenWeather
    // calls, so unthrottled traffic multiplies upstream quota burn.
    const rateLimit = await rateLimitRequest(request);
    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    // Get API key from server-side environment (without NEXT_PUBLIC_ prefix)
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      console.error('OpenWeatherMap API key not configured in environment variables');
      return NextResponse.json(
        { error: 'OpenWeatherMap API key not configured' },
        { status: 500 }
      );
    }
    
    // Get user coordinates from query params (optional)
    const searchParams = request.nextUrl.searchParams;
    const userCoords = parseOptionalLatLonQuery(
      searchParams.get('lat'),
      searchParams.get('lon')
    );
    
    // Fetch hot and cold batches concurrently — they are independent, and
    // awaiting them serially doubled cold-cache route latency.
    const [hotResults, coldResults] = await Promise.all([
      Promise.all(HOT_LOCATIONS.map(loc => fetchLocationTemperature(loc, apiKey))),
      Promise.all(COLD_LOCATIONS.map(loc => fetchLocationTemperature(loc, apiKey))),
    ]);
    const validHotResults = hotResults.filter(r => r !== null) as LocationTemperature[];
    const validColdResults = coldResults.filter(r => r !== null) as LocationTemperature[];
    
    // Sort by temperature
    validHotResults.sort((a, b) => b.temp - a.temp);
    validColdResults.sort((a, b) => a.temp - b.temp);
    
    // Get user location temperature only when valid lat/lon query params are present
    let userLocation;
    if (userCoords) {
      try {
        const response = await fetchWithTimeout(
          `https://api.openweathermap.org/data/2.5/weather?lat=${userCoords.lat}&lon=${userCoords.lon}&units=imperial&appid=${apiKey}`,
          { signal: request.signal }
        );
        
        if (response.ok) {
          const data = await response.json();
          const userTemp = Math.round(data.main.temp);
          
          // Calculate global rank
          const allTemps = [...validHotResults, ...validColdResults]
            .map(l => l.temp)
            .sort((a, b) => b - a);
          
          const globalRank = allTemps.findIndex(t => t <= userTemp) + 1;
          
          userLocation = {
            temp: userTemp,
            tempC: Math.round((userTemp - 32) * 5/9),
            globalRank,
            totalLocations: allTemps.length
          };
        }
      } catch (error) {
        console.error('Error fetching user location:', error);
      }
    }
    
    const extremesData = {
      hottest: validHotResults[0],
      coldest: validColdResults[0],
      topHot: validHotResults.slice(0, 5),
      topCold: validColdResults.slice(0, 5),
      userLocation,
      lastUpdated: Date.now()
    };
    
    return NextResponse.json(extremesData, {
      headers: {
        // The page client-caches for 30 min; let the CDN absorb repeat
        // traffic too. Skip shared caching for personalized responses.
        'Cache-Control': userCoords
          ? 'private, max-age=300'
          : 'public, s-maxage=900, stale-while-revalidate=900',
      },
    });

  } catch (error) {
    console.error('Error in extremes API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extreme temperatures' },
      { status: 500 }
    );
  }
}

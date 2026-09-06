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
 * Report issues: https://github.com/jelrod27/Weather-application-/issues
 */

/**
 * Environmental Display Component
 * Combined AQI and Pollen display for consistent environmental data presentation
 */

import { AirQualityDisplay } from './air-quality-display'
import { PollenDisplay } from './pollen-display'
import type { WeatherData } from '@/lib/types'
import type { ThemeType } from '@/lib/theme-config'

interface EnvironmentalDisplayProps {
  weather: WeatherData
  theme: ThemeType
  className?: string
  minimal?: boolean
}

function EnvironmentalDisplay({ weather, theme, className, minimal = false }: EnvironmentalDisplayProps) {
  // If minimal, render a consolidated view
  if (minimal) {
    // We'll create a shared container style based on theme (can be extracted to a helper)
    // reusing the logic from individual displays or just using the glassmorphism style directly
    
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className || ''}`}>
         {/* AQI Section - Minimal */}
         <div className="flex flex-col justify-center">
           <AirQualityDisplay 
             aqi={weather.aqi} 
             theme={theme}
             minimal={true}
             className="h-full border-none shadow-none p-0 bg-transparent"
           />
         </div>
         
         {/* Pollen Section - Minimal */}
         <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-4">
           <PollenDisplay 
             pollen={weather.pollen} 
             theme={theme}
             minimal={true}
             className="h-full border-none shadow-none p-0 bg-transparent"
           />
         </div>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className || ''}`}>
      <AirQualityDisplay 
        aqi={weather.aqi} 
        theme={theme}
        pollutants={weather.pollutants}
      />
      <PollenDisplay 
        pollen={weather.pollen} 
        theme={theme}
      />
    </div>
  )
}

export default EnvironmentalDisplay
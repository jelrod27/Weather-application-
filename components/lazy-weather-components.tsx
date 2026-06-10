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
 * Lazy-loaded weather components for better performance
 * Components load only when needed, improving initial page load times
 */

import { lazy, Suspense } from 'react'
import { ErrorBoundary } from './error-boundary'
import { LoadingSpinner } from '@/components/ui/loading-state'
import type { WeatherData, ForecastDay } from '@/lib/types'
import type { ThemeType } from '@/lib/theme-config'

// Lazy load weather components
const Forecast = lazy(() => import('./forecast'))
const ForecastDetails = lazy(() => import('./forecast-details'))
const EnvironmentalDisplay = lazy(() => import('./environmental-display'))

// Loading spinner component - uses CSS variables for theme consistency
function WeatherComponentLoader({ theme }: { theme: ThemeType }) {
  return (
    <div className="flex justify-center items-center py-8">
      <LoadingSpinner size="md" label="Loading weather data" className="text-weather-primary" />
      <span className="ml-2 text-weather-text text-sm">Loading weather data...</span>
    </div>
  )
}

export function LazyForecast(props: { 
  forecast: ForecastDay[]; 
  theme?: ThemeType; 
  onDayClick?: (index: number) => void;
  selectedDay?: number | null;
}) {
  return (
    <ErrorBoundary componentName="Weather Forecast">
      <Suspense fallback={<WeatherComponentLoader theme={props.theme || 'nord'} />}>
        <Forecast {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}

export function LazyForecastDetails(props: { 
  forecast: ForecastDay[];
  selectedDay: number | null;
  theme?: ThemeType;
  currentWeatherData?: {
    humidity: number;
    wind: { speed: number; direction?: string };
    pressure: string;
    uvIndex: number;
    sunrise: string;
    sunset: string;
  };
}) {
  return (
    <ErrorBoundary componentName="Forecast Details">
      <Suspense fallback={<WeatherComponentLoader theme={props.theme || 'nord'} />}>
        <ForecastDetails {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}

function LazyEnvironmentalDisplay(props: { 
  weather: WeatherData;
  theme: ThemeType;
  className?: string;
  minimal?: boolean;
}) {
  return (
    <ErrorBoundary componentName="Environmental Display">
      <Suspense fallback={<WeatherComponentLoader theme={props.theme} />}>
        <EnvironmentalDisplay {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}
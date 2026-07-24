"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { useAuth } from "@/lib/auth"
import { ArrowLeft, Loader2 } from "lucide-react"
import { fetchWeatherByLocation } from "@/lib/weather"
import HourlyForecast from "@/components/hourly-forecast"
import type { WeatherData } from "@/lib/types"
import { resolveUnitSystem } from "@/lib/preferences/resolve"
import { userCacheService } from "@/lib/user-cache-service"

export default function HourlyClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { theme } = useTheme()
  const { preferences } = useAuth()
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const city = searchParams.get('city')
  const unitSystem = resolveUnitSystem(
    preferences,
    userCacheService.getUnitSystem(),
  )

  useEffect(() => {
    async function loadWeather() {
      if (!lat || !lon) {
        setError('Location coordinates are required')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await fetchWeatherByLocation(`${lat},${lon}`, unitSystem)
        setWeather(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching weather:', err)
        setError('Failed to load weather data')
      } finally {
        setLoading(false)
      }
    }

    loadWeather()
  }, [lat, lon, unitSystem])

  const handleBack = () => {
    router.back()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--accent)]" />
          <span className="ml-4 text-xl text-[var(--text)]">Loading hourly forecast...</span>
        </div>
      </div>
    )
  }

  if (error || !weather?.hourlyForecast || weather.hourlyForecast.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 mb-6 px-4 py-2 bg-[var(--card-bg)] border-0 text-[var(--text)] hover:bg-[var(--accent)] hover:text-[var(--card-bg)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="text-center py-12">
          <p className="text-xl text-[var(--text)]">{error || 'No hourly forecast data available'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 mb-4 px-4 py-2 bg-[var(--card-bg)] border-0 text-[var(--text)] hover:bg-[var(--accent)] hover:text-[var(--card-bg)] transition-colors font-mono uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] font-mono uppercase tracking-wider">
          ⏰ 48-Hour Forecast
        </h1>
        {city && (
          <p className="text-lg text-[var(--text-secondary)] mt-2 font-mono">
            {city}
          </p>
        )}
      </div>

      <HourlyForecast
        hourly={weather.hourlyForecast}
        theme={theme}
        tempUnit={weather.unit || '°F'}
      />

      <div className="mt-8 p-4 bg-[var(--card-bg)] border-0 text-[var(--text-secondary)] font-mono text-sm">
        <p>💡 <strong>Tip:</strong> Scroll horizontally to view all 48 hours of forecast data</p>
        <p className="mt-2">🌡️ Temperatures shown are in {weather.unit === '°F' ? 'Fahrenheit' : 'Celsius'}</p>
        <p className="mt-2">💧 Precipitation chances are displayed for each hour</p>
      </div>
    </div>
  )
}

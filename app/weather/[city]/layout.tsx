import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { fetchOpenMeteoForecast } from '@/lib/open-meteo'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { getWMOCondition } from '@/lib/wmo-codes'
import { toStateAbbr } from '@/lib/us-states'
import { captureError } from '@/lib/error-utils'
type Props = {
  params: Promise<{ city: string }>
  children: React.ReactNode
}

const OPEN_METEO_GEO = 'https://geocoding-api.open-meteo.com/v1/search'

/** Minimal weather shape needed to enrich metadata. */
interface MetadataWeather {
  temperature: number
  unit: string
  condition: string
  forecast: { day: string; highTemp: number; condition: string }[]
}

function wmoToCondition(code: number): string {
  switch (getWMOCondition(code)) {
    case 'sunny': return 'Clear'
    case 'cloudy': return 'Clouds'
    case 'rainy': return 'Rain'
    case 'snowy': return 'Snow'
    default: return 'Clear'
  }
}

/**
 * Fetch the weather used to enrich the meta description and JSON-LD.
 *
 * Calls Open-Meteo's geocoding and forecast APIs directly instead of
 * self-fetching through this deployment's own /api routes: the previous
 * implementation made 4+ unbounded HTTP round-trips back into the same
 * deployment on every SSR of a city page, blocking TTFB — only to fetch
 * data the client refetches on hydration anyway. Cached for 15 minutes
 * per city slug.
 */
const getMetadataWeather = unstable_cache(
  async (citySlug: string): Promise<MetadataWeather | null> => {
    const parts = citySlug.split('-')
    const trailing = parts.length >= 2 ? parts[parts.length - 1] : null
    const stateAbbr = trailing ? toStateAbbr(trailing) : null
    const cityName = (stateAbbr ? parts.slice(0, -1) : parts).join(' ')
    if (!cityName) return null

    const geoRes = await fetchWithTimeout(
      `${OPEN_METEO_GEO}?name=${encodeURIComponent(cityName)}&count=10&language=en&format=json`,
      { timeoutMs: 8000, next: { revalidate: 86400 } }
    )
    if (!geoRes.ok) return null
    const geo = (await geoRes.json()) as {
      results?: { latitude: number; longitude: number; admin1?: string; country_code?: string }[]
    }
    let results = geo.results ?? []
    if (results.length === 0) return null
    if (stateAbbr) {
      const filtered = results.filter(
        (r) => r.country_code?.toUpperCase() === 'US' && toStateAbbr(r.admin1) === stateAbbr
      )
      if (filtered.length > 0) results = filtered
    }
    const place = results[0]

    const forecast = await fetchOpenMeteoForecast(place.latitude, place.longitude, {
      forecastDays: 5,
    })
    const current = forecast.current
    if (current?.temperature_2m == null) return null

    const dailyTime = forecast.daily?.time ?? []
    const days = dailyTime.slice(0, 5).map((t, i) => ({
      day: new Date(`${t}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }),
      highTemp: Math.round(forecast.daily?.temperature_2m_max?.[i] ?? 0),
      condition: wmoToCondition(forecast.daily?.weather_code?.[i] ?? 0),
    }))

    return {
      temperature: Math.round(current.temperature_2m),
      unit: '°F',
      condition: wmoToCondition(current.weather_code ?? 0),
      forecast: days,
    }
  },
  ['city-metadata-weather'],
  { revalidate: 900 }
)

// City name formatting function
function formatCityName(citySlug: string): string {
  return citySlug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// City slug to search term conversion
function citySlugToSearchTerm(citySlug: string): string {
  const parts = citySlug.split('-')
  if (parts.length >= 2) {
    const state = parts[parts.length - 1].toUpperCase()
    const city = parts.slice(0, -1).join(' ')
    return `${city}, ${state}`
  }
  return formatCityName(citySlug)
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params
  const cityName = formatCityName(city)
  const searchTerm = citySlugToSearchTerm(city)
  
  // Default metadata
  const title = `${cityName} Weather Forecast | 16-Bit Retro Weather Terminal`
  const description = `Get ${cityName} weather in nostalgic 16-bit style. Real-time conditions, 7-day forecast, and atmospheric data for ${searchTerm}.`
  const canonical = `https://www.16bitweather.co/weather/${city}`
  
  // Try to fetch weather data for enhanced metadata
  let weatherData: MetadataWeather | null = null
  try {
    weatherData = await getMetadataWeather(city)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // Timeouts and upstream hiccups are routine for non-critical metadata
    // enhancement; only unexpected failures go to Sentry.
    const isExpectedTransientFailure = /timeout|timed out|abort|401|unauthorized|authentication error/i.test(message)
    if (isExpectedTransientFailure) {
      console.warn('[metadata-fetch] Weather data unavailable for enhanced metadata:', searchTerm)
    } else {
      captureError(error, 'metadata-fetch', { city: searchTerm })
    }
  }

  // Enhanced description with current weather if available
  let enhancedDescription = description
  if (weatherData) {
    enhancedDescription = `Current weather in ${cityName}: ${weatherData.temperature}${weatherData.unit}, ${weatherData.condition}. Get real-time weather conditions, 7-day forecast, and atmospheric data in nostalgic 16-bit style.`
  }

  // Structured data for WeatherForecast
  const structuredData: {
    "@context": string;
    "@type": string;
    name: string;
    description: string;
    url: string;
    mainEntity: Record<string, unknown>;
    isPartOf: Record<string, unknown>;
  } = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title,
    "description": enhancedDescription,
    "url": canonical,
    "mainEntity": {
      "@type": "Place",
      "name": cityName,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": cityName
      }
    },
    "isPartOf": {
      "@type": "WebSite",
      "name": "16-Bit Weather Education Platform",
      "url": "https://www.16bitweather.co"
    }
  }

  // Add weather forecast structured data if available
  if (weatherData && weatherData.forecast && weatherData.forecast.length > 0) {
    // Replace mainEntity with the weather forecast as the main entity
    structuredData.mainEntity = {
      "@type": "WeatherForecast",
      "dateModified": new Date().toISOString(),
      "expires": new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
      "about": {
        "@type": "Place",
        "name": cityName,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": cityName
        }
      },
      "provider": {
        "@type": "Organization",
        "name": "16-Bit Weather Platform",
        "url": "https://www.16bitweather.co"
      },
      "dayOfWeek": weatherData.forecast.slice(0, 5).map((day, index) => {
        const date = new Date()
        date.setDate(date.getDate() + index)
        return {
          "@type": "DayOfWeek",
          "name": day.day || date.toLocaleDateString('en-US', { weekday: 'long' }),
          "temperature": `${day.highTemp}${weatherData.unit}`,
          "temperatureUnit": weatherData.unit === '°F' ? 'Fahrenheit' : 'Celsius',
          "conditions": day.condition || 'Partly Cloudy'
        }
      })
    } as Record<string, unknown>
  }

  return {
    title,
    description: enhancedDescription,
    keywords: `${cityName} weather, weather forecast ${cityName}, ${searchTerm} weather, retro weather, 16-bit weather, current conditions ${cityName}`,
    authors: [{ name: 'Weather Education Systems' }],
    creator: 'Weather Education Systems',
    publisher: 'Weather Education Systems',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL('https://www.16bitweather.co'),
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description: enhancedDescription,
      url: canonical,
      siteName: '16-Bit Weather Education',
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(cityName)}+Weather&subtitle=16-Bit+Retro+Forecast`,
          width: 1200,
          height: 630,
          alt: `${cityName} Weather Forecast - 16-Bit Style`,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: enhancedDescription,
      images: [`/api/og?title=${encodeURIComponent(cityName)}+Weather&subtitle=16-Bit+Retro+Forecast`],
      creator: '@weather16bit',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: {
      'application/ld+json': JSON.stringify(structuredData),
    }
  }
}

export default function CityWeatherLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  )
}

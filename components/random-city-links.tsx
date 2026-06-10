"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CITY_DATA } from '@/lib/city-data'
import type { ThemeType } from '@/lib/theme-config'

// Convert CITY_DATA object to array for component use
export const ALL_CITIES = Object.entries(CITY_DATA || {}).map(([slug, data]) => ({
  slug,
  name: data.name.toUpperCase(),
  state: data.state
}))

// Fallback city list in case CITY_DATA fails to load
const FALLBACK_CITIES = [
  { slug: 'new-york-ny', name: 'NEW YORK', state: 'NY' },
  { slug: 'los-angeles-ca', name: 'LOS ANGELES', state: 'CA' },
  { slug: 'chicago-il', name: 'CHICAGO', state: 'IL' },
  { slug: 'houston-tx', name: 'HOUSTON', state: 'TX' },
  { slug: 'phoenix-az', name: 'PHOENIX', state: 'AZ' },
  { slug: 'philadelphia-pa', name: 'PHILADELPHIA', state: 'PA' },
  { slug: 'san-diego-ca', name: 'SAN DIEGO', state: 'CA' },
  { slug: 'dallas-tx', name: 'DALLAS', state: 'TX' },
  { slug: 'austin-tx', name: 'AUSTIN', state: 'TX' },
  { slug: 'san-francisco-ca', name: 'SAN FRANCISCO', state: 'CA' },
]

interface RandomCityLinksProps {
  theme?: ThemeType
}

export default function RandomCityLinks({ theme = 'nord' }: RandomCityLinksProps) {
  const [displayedCities, setDisplayedCities] = useState<typeof ALL_CITIES>([])
  const [isLoading, setIsLoading] = useState(true)

  // Get safe city list with fallback
  const getCityList = () => {
    try {
      return ALL_CITIES && ALL_CITIES.length > 0 ? ALL_CITIES : FALLBACK_CITIES
    } catch (error) {
      console.error('Error accessing city data:', error)
      return FALLBACK_CITIES
    }
  }

  useEffect(() => {
    try {
      // Shuffle and select 10 random cities from available data
      const cityList = getCityList()
      const shuffled = [...cityList].sort(() => Math.random() - 0.5)
      setDisplayedCities(shuffled.slice(0, 10))
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading cities:', error)
      // Fall back to first 10 fallback cities
      setDisplayedCities(FALLBACK_CITIES.slice(0, 10))
      setIsLoading(false)
    }
  }, [])

  const handleRefresh = () => {
    try {
      const cityList = getCityList()
      const shuffled = [...cityList].sort(() => Math.random() - 0.5)
      setDisplayedCities(shuffled.slice(0, 10))
    } catch (error) {
      console.error('Error refreshing cities:', error)
      // Use fallback cities if refresh fails
      const shuffled = [...FALLBACK_CITIES].sort(() => Math.random() - 0.5)
      setDisplayedCities(shuffled.slice(0, 10))
    }
  }

  if (isLoading) {
    return (
      <div className="mt-16 pt-8 border-t-0 text-center">
        <div className="animate-pulse text-terminal-text-primary">Loading cities...</div>
      </div>
    )
  }

  return (
    <div className="mt-16 pt-8 border-t-0 text-center">
      <div className="flex items-center justify-center gap-4 mb-4">
        <h2 className="text-lg font-bold uppercase tracking-wider font-mono text-terminal-accent">
          WEATHER BY CITY
        </h2>
        <button
          onClick={handleRefresh}
          className="px-3 py-1 text-xs font-mono rounded border-0 transition-all duration-200 text-terminal-text-primary bg-terminal-accent/20 hover:bg-terminal-accent/40"
          title="Show different cities"
          aria-label="Shuffle cities"
        >
          ↻ SHUFFLE
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-4xl mx-auto">
        {displayedCities.map((city) => (
          <Link
            key={city.slug}
            href={`/weather/${city.slug}`}
            className="block px-3 py-2 text-sm font-mono rounded border-0 transition-all duration-200 text-terminal-text-primary hover:bg-terminal-accent hover:text-terminal-bg-primary"
          >
            {city.name}
          </Link>
        ))}
      </div>
      
      <div className={cn(
        "mt-4 text-xs font-mono opacity-60",
        "text-weather-text"
      )}>
        Showing 10 of {getCityList().length} cities • Click shuffle for more
      </div>
    </div>
  )
}

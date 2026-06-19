'use client'

import dynamic from 'next/dynamic'
import type { ThemeType } from '@/lib/theme-config'

interface WeatherMapProps {
  latitude?: number
  longitude?: number
  locationName?: string
  theme?: ThemeType
  displayMode?: 'full-page' | 'widget'
}

// Create a completely dynamic map component with no SSR
const MapComponent = dynamic(() => import('./radar-v2/radar-shell'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">
      <div className="text-white">Loading map...</div>
    </div>
  )
})

const WeatherMap = (props: WeatherMapProps) => {
  return (
    <div className="w-full h-full">
      <MapComponent {...props} />
    </div>
  )
}

export default WeatherMap

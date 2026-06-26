'use client'

/**
 * MapContainer - Lazy loads OpenLayers map with intersection observer
 *
 * PERFORMANCE: This component only loads the map (~400KB) when the user
 * scrolls it into view, significantly improving initial page load.
 */

import { useInView } from 'react-intersection-observer'
import dynamic from 'next/dynamic'
import { MapSkeleton } from '@/components/skeletons/map-skeleton'
import type { ThemeType } from '@/lib/theme-config'

// Dynamic import with ssr:false - OpenLayers requires browser APIs
const WeatherMapOpenLayers = dynamic(
  () => import('../radar-v2/radar-shell').then(mod => mod.default),
  {
    ssr: false,
    loading: () => <MapSkeleton height="h-full" />
  }
)

interface MapContainerProps {
  latitude?: number
  longitude?: number
  locationName?: string
  theme?: ThemeType | string
  displayMode?: 'widget' | 'full-page'
  className?: string
}

export function MapContainer({
  latitude,
  longitude,
  locationName,
  theme = 'nord',
  displayMode = 'widget',
  className
}: MapContainerProps) {
  // Only load map when user scrolls within 200px of it
  const { ref, inView } = useInView({
    triggerOnce: true,  // Only trigger once - don't unload after loading
    rootMargin: '200px', // Start loading 200px before it enters viewport
    threshold: 0,
  })

  const height = displayMode === 'full-page' ? 'h-[600px]' : 'h-full'
  const minHeight = displayMode === 'full-page' ? '600px' : undefined

  return (
    <div
      ref={ref}
      className={`w-full ${height} ${className || ''}`}
      style={{
        contain: 'layout style paint',
        minHeight,
      }}
    >
      {inView ? (
        <WeatherMapOpenLayers
          latitude={latitude}
          longitude={longitude}
          locationName={locationName}
          theme={theme as ThemeType}
          displayMode={displayMode}
        />
      ) : (
        <MapSkeleton height={height} />
      )}
    </div>
  )
}


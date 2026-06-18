import type { ThemeType } from '@/lib/theme-config'

export interface WeatherMapProps {
  latitude?: number
  longitude?: number
  locationName?: string
  theme?: ThemeType
  displayMode?: 'full-page' | 'widget'
}

export type RadarFeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type?: string
    geometry?: unknown
    properties?: Record<string, unknown>
  }>
}

export interface RadarStormReport {
  category: 'tornado' | 'hail' | 'wind'
  time: string
  size: string
  location: string
  state: string
  lat: number | null
  lon: number | null
  comments: string
  date: string
}

export interface RadarSelectedOverlay {
  x: number
  y: number
  title: string
  body: string
}

export type RadarPlaybackSpeed = 0.5 | 1 | 2

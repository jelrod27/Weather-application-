import { sampleGreatCircle } from '@/lib/aviation/route-corridor'
import type { Aircraft } from '@/lib/aviation/aircraft-types'
import { cartoVoyagerTileUrls } from '@/lib/maps/carto-basemap'
import type { MapOptions } from 'maplibre-gl'

type MapStyleSpec = Exclude<NonNullable<MapOptions['style']>, string>

type FeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    id?: string
    properties: Record<string, string | number>
    geometry:
      | { type: 'Point'; coordinates: [number, number] }
      | { type: 'LineString'; coordinates: Array<[number, number]> }
  }>
}

export const AIRCRAFT_ICON_ID = 'aircraft-plane'
export const AIRCRAFT_LAYER_ID = 'aircraft-icon'
export const AIRCRAFT_LABEL_LAYER_ID = 'aircraft-label'

export const POLL_MS = 5_000
export const MOVE_FETCH_DEBOUNCE_MS = 400
export const DEFAULT_CENTER: [number, number] = [-98.35, 39.5]
export const DEFAULT_ZOOM = 5

/**
 * Same light Carto Voyager basemap as radar. Glyphs still come from
 * OpenFreeMap for callsign / airport labels.
 * CSP: connect-src must allow *.basemaps.cartocdn.com + tiles.openfreemap.org.
 */
export const CARTO_VOYAGER_STYLE: MapStyleSpec = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: cartoVoyagerTileUrls(),
      tileSize: 256,
      attribution: '© CARTO © OpenStreetMap contributors',
    },
  },
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  layers: [
    {
      id: 'carto-basemap',
      type: 'raster',
      source: 'carto',
    },
  ],
}

export type RouteMapEndpoints = {
  origin: { lat: number; lon: number; label?: string }
  destination: { lat: number; lon: number; label?: string }
}

export function toFeatureCollection(aircraft: Aircraft[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: aircraft.map((a) => ({
      type: 'Feature',
      id: a.icao24,
      properties: {
        icao24: a.icao24,
        callsign: a.callsign ?? '',
        track: a.trackDeg ?? 0,
      },
      geometry: {
        type: 'Point',
        coordinates: [a.lon, a.lat],
      },
    })),
  }
}

export function radiusForZoom(zoom: number): number {
  if (zoom < 4) return 250
  if (zoom < 5) return 200
  if (zoom < 6) return 150
  if (zoom < 7) return 100
  if (zoom < 8) return 60
  return 40
}

export function emptyLineCollection(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

export function routeLineCollection(
  endpoints: RouteMapEndpoints | null | undefined,
): FeatureCollection {
  if (!endpoints) return emptyLineCollection()
  const samples = sampleGreatCircle(
    { lat: endpoints.origin.lat, lon: endpoints.origin.lon },
    { lat: endpoints.destination.lat, lon: endpoints.destination.lon },
    48,
  )
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'planned' },
        geometry: {
          type: 'LineString',
          coordinates: samples.map((p) => [p.lon, p.lat]),
        },
      },
    ],
  }
}

export function airportPointsCollection(
  endpoints: RouteMapEndpoints | null | undefined,
): FeatureCollection {
  if (!endpoints) return emptyLineCollection()
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { label: endpoints.origin.label ?? 'DEP', role: 'origin' },
        geometry: {
          type: 'Point',
          coordinates: [endpoints.origin.lon, endpoints.origin.lat],
        },
      },
      {
        type: 'Feature',
        properties: { label: endpoints.destination.label ?? 'ARR', role: 'destination' },
        geometry: {
          type: 'Point',
          coordinates: [endpoints.destination.lon, endpoints.destination.lat],
        },
      },
    ],
  }
}

export function trailLineCollection(
  trail: Array<{ lat: number; lon: number }> | undefined,
): FeatureCollection {
  if (!trail || trail.length < 2) return emptyLineCollection()
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'trail' },
        geometry: {
          type: 'LineString',
          coordinates: trail.map((p) => [p.lon, p.lat]),
        },
      },
    ],
  }
}

export function routeKey(endpoints: RouteMapEndpoints | null | undefined): string | null {
  if (!endpoints) return null
  return `${endpoints.origin.lat},${endpoints.origin.lon}->${endpoints.destination.lat},${endpoints.destination.lon}`
}

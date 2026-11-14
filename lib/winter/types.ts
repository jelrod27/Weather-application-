export type WinterMapProduct = 'snow' | 'ice' | 'impacts'
export type WinterDay = 1 | 2 | 3
export type WinterSnowThreshold = 4 | 8 | 12
export type WinterDataStatus = 'available' | 'empty' | 'stale' | 'unavailable'

export interface WinterMapSelection {
  product: WinterMapProduct
  day: WinterDay
  threshold: WinterSnowThreshold
}

export interface WinterContourProperties {
  category: string
  label: string
  color: string
  rank: number
}

export interface WinterLegendItem {
  label: string
  color: string
}

/** The only GeoJSON geometry types accepted from the winter outlook adapter. */
export type WinterGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }

export interface WinterContourFeature {
  type: 'Feature'
  geometry: WinterGeometry
  properties: WinterContourProperties
}

export interface WinterContours {
  type: 'FeatureCollection'
  features: WinterContourFeature[]
}

/** Geometry and validity come from the same source query, never separate cycles. */
export interface WinterMapSnapshot {
  selection: WinterMapSelection
  source: string
  sourceUrl: string
  coverage: 'Contiguous United States'
  status: WinterDataStatus
  issuedAt: string | null
  validFrom: string | null
  validTo: string | null
  fetchedAt: string
  message: string | null
  legend: WinterLegendItem[]
  contours: WinterContours
}

export interface WinterPlace {
  name: string
  lat: number
  lon: number
}

import type { NwsGeometry } from '@/lib/services/nws-alerts-service'

const EARTH_RADIUS_KM = 6371
/** Honest CONUS average density. Not a census product. */
const APPROX_PEOPLE_PER_KM2 = 36

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function asRing(value: unknown): Array<[number, number]> | null {
  if (!Array.isArray(value) || value.length < 4) return null
  const ring: Array<[number, number]> = []
  for (const pair of value) {
    if (!Array.isArray(pair) || pair.length < 2) return null
    const lon = pair[0]
    const lat = pair[1]
    if (typeof lon !== 'number' || typeof lat !== 'number' || !Number.isFinite(lon) || !Number.isFinite(lat)) {
      return null
    }
    ring.push([lon, lat])
  }
  return ring
}

/** Spherical excess approximation for a lon/lat ring (km²). */
function ringAreaKm2(ring: Array<[number, number]>): number {
  let sum = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const lon1 = ring[j][0]
    const lat1 = ring[j][1]
    const lon2 = ring[i][0]
    const lat2 = ring[i][1]
    sum += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)))
  }
  return Math.abs((sum * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2)
}

function polygonAreaKm2(rings: unknown): number {
  if (!Array.isArray(rings) || rings.length === 0) return 0
  const exterior = asRing(rings[0])
  if (!exterior) return 0
  let area = ringAreaKm2(exterior)
  for (let i = 1; i < rings.length; i += 1) {
    const hole = asRing(rings[i])
    if (hole) area -= ringAreaKm2(hole)
  }
  return Math.max(0, area)
}

export function warningCoverageKm2(geometry: NwsGeometry | null | undefined): number | null {
  if (!geometry) return null
  if (geometry.type === 'Polygon') {
    const area = polygonAreaKm2(geometry.coordinates)
    return area > 0 ? area : null
  }
  if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    const area = geometry.coordinates.reduce((sum, rings) => sum + polygonAreaKm2(rings), 0)
    return area > 0 ? area : null
  }
  return null
}

export function approxPopulationFromKm2(km2: number): number {
  return Math.max(0, Math.round(km2 * APPROX_PEOPLE_PER_KM2))
}

export function formatApproxCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}K`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return String(Math.round(value))
}

export function extractAreaStates(areaDesc: string): string[] {
  const found = new Set<string>()
  const re = /,\s*([A-Z]{2})\b/g
  let match: RegExpExecArray | null
  while ((match = re.exec(areaDesc))) {
    const code = match[1]
    if (code) found.add(code)
  }
  return [...found].sort()
}

export function formatCoverageLabel(geometry: NwsGeometry | null | undefined): {
  km2: number
  km2Label: string
  people: number
  peopleLabel: string
} | null {
  const km2 = warningCoverageKm2(geometry)
  if (km2 == null) return null
  const people = approxPopulationFromKm2(km2)
  return {
    km2,
    km2Label: `${Math.round(km2).toLocaleString()} km²`,
    people,
    peopleLabel: formatApproxCount(people),
  }
}

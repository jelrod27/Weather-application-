import type { NwsGeometry } from '@/lib/services/nws-alerts-service'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function asRing(value: unknown): Array<[number, number]> | null {
  if (!Array.isArray(value) || value.length < 4) return null
  const ring: Array<[number, number]> = []
  for (const pair of value) {
    if (!Array.isArray(pair) || pair.length < 2) return null
    const lon = pair[0]
    const lat = pair[1]
    if (!isFiniteNumber(lon) || !isFiniteNumber(lat)) return null
    ring.push([lon, lat])
  }
  return ring
}

/** Ray-cast even-odd test. `ring` is GeoJSON [lon, lat] positions. */
function pointInRing(lat: number, lon: number, ring: Array<[number, number]>): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function pointInPolygonRings(lat: number, lon: number, rings: unknown): boolean {
  if (!Array.isArray(rings) || rings.length === 0) return false
  const exterior = asRing(rings[0])
  if (!exterior) return false
  if (!pointInRing(lat, lon, exterior)) return false
  for (let i = 1; i < rings.length; i += 1) {
    const hole = asRing(rings[i])
    if (hole && pointInRing(lat, lon, hole)) return false
  }
  return true
}

/**
 * True when the pin is inside warning geometry. Null, empty, or unreadable
 * coverage is not a match — never treat unknown as local.
 */
export function pointInNwsGeometry(
  lat: number,
  lon: number,
  geometry: NwsGeometry | null | undefined,
): boolean {
  if (!geometry || !Number.isFinite(lat) || !Number.isFinite(lon)) return false

  if (geometry.type === 'Polygon') {
    return pointInPolygonRings(lat, lon, geometry.coordinates)
  }

  if (geometry.type === 'MultiPolygon') {
    if (!Array.isArray(geometry.coordinates)) return false
    return geometry.coordinates.some((polygon) => pointInPolygonRings(lat, lon, polygon))
  }

  return false
}

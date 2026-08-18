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
    if (!hole) return false
    if (pointInRing(lat, lon, hole)) return false
  }
  return true
}

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

function minVertexDistanceKm(lat: number, lon: number, ring: Array<[number, number]>): number {
  let min = Infinity
  for (const [ringLon, ringLat] of ring) {
    const km = haversineKm(lat, lon, ringLat, ringLon)
    if (km < min) min = km
  }
  return min
}

/** Local-tangent km from a point to a lon/lat segment. Fine under a few hundred km. */
function pointToSegmentKm(
  lat: number,
  lon: number,
  a: [number, number],
  b: [number, number],
): number {
  const latScale = 111.32
  const lonScale = 111.32 * Math.cos(toRad(lat))
  const px = lon * lonScale
  const py = lat * latScale
  const ax = a[0] * lonScale
  const ay = a[1] * latScale
  const bx = b[0] * lonScale
  const by = b[1] * latScale
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const ab2 = abx * abx + aby * aby
  const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2))
  const dx = px - (ax + t * abx)
  const dy = py - (ay + t * aby)
  return Math.sqrt(dx * dx + dy * dy)
}

function minRingDistanceKm(lat: number, lon: number, ring: Array<[number, number]>): number {
  let min = minVertexDistanceKm(lat, lon, ring)
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const km = pointToSegmentKm(lat, lon, ring[j], ring[i])
    if (km < min) min = km
  }
  return min
}

function distanceToPolygonRings(lat: number, lon: number, rings: unknown): number | null {
  if (!Array.isArray(rings) || rings.length === 0) return null
  const exterior = asRing(rings[0])
  if (!exterior) return null
  if (pointInRing(lat, lon, exterior)) {
    for (let i = 1; i < rings.length; i += 1) {
      const hole = asRing(rings[i])
      if (!hole) return null
      if (pointInRing(lat, lon, hole)) return minRingDistanceKm(lat, lon, hole)
    }
    return 0
  }
  return minRingDistanceKm(lat, lon, exterior)
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

/**
 * Great-circle km from the pin to warning geometry. Inside is 0. Missing or
 * unreadable geometry is null — never invent a nearby distance.
 */
export function distanceKmToNwsGeometry(
  lat: number,
  lon: number,
  geometry: NwsGeometry | null | undefined,
): number | null {
  if (!geometry || !Number.isFinite(lat) || !Number.isFinite(lon)) return null

  if (geometry.type === 'Polygon') {
    return distanceToPolygonRings(lat, lon, geometry.coordinates)
  }

  if (geometry.type === 'MultiPolygon') {
    if (!Array.isArray(geometry.coordinates)) return null
    let min: number | null = null
    for (const polygon of geometry.coordinates) {
      const km = distanceToPolygonRings(lat, lon, polygon)
      if (km == null) continue
      if (min == null || km < min) min = km
    }
    return min
  }

  return null
}

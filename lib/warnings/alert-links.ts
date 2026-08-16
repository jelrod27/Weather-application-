import type { NwsGeometry } from '@/lib/services/nws-alerts-service'

/** Path slug for a warning detail page. Uses the NWS id tail so slashes do not break routing. */
export function warningIdSlug(alertId: string): string {
  const trimmed = alertId.trim()
  const alertsIdx = trimmed.lastIndexOf('/alerts/')
  if (alertsIdx >= 0) return trimmed.slice(alertsIdx + '/alerts/'.length)
  return trimmed
}

export function getWarningDetailHref(alertId: string | null | undefined): string {
  if (!alertId) return '/warnings'
  return `/warnings/${encodeURIComponent(warningIdSlug(alertId))}`
}

export function nwsGeometryBBox(
  geometry: NwsGeometry | null | undefined,
): { minLat: number; minLon: number; maxLat: number; maxLon: number } | null {
  if (!geometry) return null
  const points: Array<[number, number]> = []

  function walk(value: unknown): void {
    if (!Array.isArray(value) || value.length === 0) return
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      points.push([value[0], value[1]])
      return
    }
    for (const item of value) walk(item)
  }

  walk(geometry.coordinates)
  if (points.length === 0) return null

  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  for (const [lon, lat] of points) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
    minLon = Math.min(minLon, lon)
    maxLon = Math.max(maxLon, lon)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  }
  if (!Number.isFinite(minLat) || !Number.isFinite(minLon)) return null
  return { minLat, minLon, maxLat, maxLon }
}

export function getRadarHrefForGeometry(geometry: NwsGeometry | null | undefined): string {
  const box = nwsGeometryBBox(geometry)
  if (!box) return '/radar'
  const lat = (box.minLat + box.maxLat) / 2
  const lon = (box.minLon + box.maxLon) / 2
  const params = new URLSearchParams({
    lat: lat.toFixed(4),
    lon: lon.toFixed(4),
  })
  return `/radar?${params.toString()}`
}

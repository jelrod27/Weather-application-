/**
 * Parse optional lat/lon from URL search params (NextRequest / URLSearchParams).
 * Returns null if either is missing, blank, non-numeric, or out of WGS84 range.
 */
export function parseOptionalLatLonQuery(
  latRaw: string | null,
  lonRaw: string | null
): { lat: number; lon: number } | null {
  if (latRaw == null || lonRaw == null) return null
  const tLat = latRaw.trim()
  const tLon = lonRaw.trim()
  if (tLat === '' || tLon === '') return null
  // Number() rejects partially numeric strings that parseFloat would accept (e.g. "40.7abc").
  const lat = Number(tLat)
  const lon = Number(tLon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { lat, lon }
}

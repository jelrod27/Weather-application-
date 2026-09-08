export interface RadarCoordinateTarget {
  latitude: number
  longitude: number
  label: string
}

interface SearchParamsReader {
  get(name: string): string | null
}

export function parseRadarCoordinateTarget(
  searchParams: SearchParamsReader,
): RadarCoordinateTarget | null {
  const latRaw = searchParams.get('lat')
  const lonRaw = searchParams.get('lon')

  if (!latRaw?.trim() || !lonRaw?.trim()) return null

  const latitude = Number(latRaw)
  const longitude = Number(lonRaw)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null

  return {
    latitude,
    longitude,
    label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
  }
}

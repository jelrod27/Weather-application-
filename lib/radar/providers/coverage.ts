import { isUSLocation } from '@/lib/utils/location-utils'

export type RadarCoverageRegion = 'us' | 'canada' | 'north-america-fallback' | 'global'

export function isCanadaRadarCoverage(latitude: number, longitude: number): boolean {
  return latitude >= 41 && latitude <= 84 && longitude >= -142 && longitude <= -52
}

export function isNorthAmericaFallbackCoverage(latitude: number, longitude: number): boolean {
  return latitude >= 7 && latitude <= 84 && longitude >= -170 && longitude <= -45
}

export function getRadarCoverageRegion(
  latitude: number,
  longitude: number
): RadarCoverageRegion {
  if (isUSLocation(latitude, longitude)) return 'us'
  if (isCanadaRadarCoverage(latitude, longitude)) return 'canada'
  if (isNorthAmericaFallbackCoverage(latitude, longitude)) return 'north-america-fallback'
  return 'global'
}

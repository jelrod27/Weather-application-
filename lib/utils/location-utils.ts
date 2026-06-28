/**
 * Location utility functions for weather application
 */

/**
 * Check if coordinates are within the United States
 * Includes CONUS, Alaska, Hawaii, Puerto Rico, and US territories
 */
export function isUSLocation(latitude: number, longitude: number): boolean {
  // CONUS (Continental US)
  const isCONUS =
    latitude >= 24.5 && latitude <= 49.5 &&
    longitude >= -125 && longitude <= -66

  // Alaska
  const isAlaska =
    latitude >= 51 && latitude <= 71.5 &&
    longitude >= -180 && longitude <= -129

  // Hawaii
  const isHawaii =
    latitude >= 18.9 && latitude <= 22.5 &&
    longitude >= -160.5 && longitude <= -154.5

  // Puerto Rico
  const isPuertoRico =
    latitude >= 17.9 && latitude <= 18.6 &&
    longitude >= -67.3 && longitude <= -65.2

  // US Virgin Islands
  const isUSVI =
    latitude >= 17.6 && latitude <= 18.5 &&
    longitude >= -65.1 && longitude <= -64.5

  // Guam
  const isGuam =
    latitude >= 13.2 && latitude <= 13.7 &&
    longitude >= 144.6 && longitude <= 145

  return isCONUS || isAlaska || isHawaii || isPuertoRico || isUSVI || isGuam
}

/**
 * Get region name for US location
 */
function getUSRegion(latitude: number, longitude: number): string | null {
  if (!isUSLocation(latitude, longitude)) return null

  if (latitude >= 51 && latitude <= 71.5 && longitude >= -180 && longitude <= -129) {
    return 'Alaska'
  }

  if (latitude >= 18.9 && latitude <= 22.5 && longitude >= -160.5 && longitude <= -154.5) {
    return 'Hawaii'
  }

  if (latitude >= 17.9 && latitude <= 18.6 && longitude >= -67.3 && longitude <= -65.2) {
    return 'Puerto Rico'
  }

  if (latitude >= 17.6 && latitude <= 18.5 && longitude >= -65.1 && longitude <= -64.5) {
    return 'US Virgin Islands'
  }

  if (latitude >= 13.2 && latitude <= 13.7 && longitude >= 144.6 && longitude <= 145) {
    return 'Guam'
  }

  return 'Continental US'
}

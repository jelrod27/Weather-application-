export type StormMotion = {
  timeZ: string
  headingDeg: number
  speedKt: number
  lat: number
  lon: number
}

const TML_RE =
  /TIME\.{3}MOT\.{3}LOC\s+(\d{3,4}Z)\s+(\d{1,3})DEG\s+(\d+(?:\.\d+)?)KT\s+(\d{4,5})\s+(\d{4,5})/i

function packedDegrees(value: string): number {
  const digits = value.trim()
  if (digits.length === 4) return Number.parseInt(digits, 10) / 100
  if (digits.length === 5) return Number.parseInt(digits, 10) / 100
  return Number.NaN
}

export function parseTimeMotLoc(description: string): StormMotion | null {
  const match = description.match(TML_RE)
  if (!match) return null
  const lat = packedDegrees(match[4])
  const lonPacked = packedDegrees(match[5])
  const headingDeg = Number.parseInt(match[2], 10)
  const speedKt = Number.parseFloat(match[3])
  if (![lat, lonPacked, headingDeg, speedKt].every(Number.isFinite)) return null
  if (lat < 0 || lat > 90 || lonPacked < 0 || lonPacked > 180) return null
  return {
    timeZ: match[1].toUpperCase(),
    headingDeg,
    speedKt,
    lat,
    lon: -lonPacked,
  }
}

const KT_TO_KMH = 1.852
const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

/** Destination point given distance km and heading (degrees toward). */
export function projectMotion(motion: StormMotion, minutesAhead: number): { lat: number; lon: number } {
  const distanceKm = motion.speedKt * KT_TO_KMH * (minutesAhead / 60)
  const brng = toRad(motion.headingDeg)
  const lat1 = toRad(motion.lat)
  const lon1 = toRad(motion.lon)
  const ang = distanceKm / EARTH_RADIUS_KM
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(ang) + Math.cos(lat1) * Math.sin(ang) * Math.cos(brng),
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(ang) * Math.cos(lat1),
      Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2),
    )
  return { lat: toDeg(lat2), lon: toDeg(lon2) }
}

/**
 * Geocoding providers (Open-Meteo, Zippopotam, Nominatim).
 * Used by the geocoding API route and server callers (e.g. trip-score).
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { toStateAbbr } from '@/lib/us-states'
import type { GeocodingResponse } from '@/lib/weather'

const OPEN_METEO_GEO = 'https://geocoding-api.open-meteo.com/v1/search'
const ZIPPOPOTAM = 'https://api.zippopotam.us'
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const USER_AGENT = '16BitWeather/1.0 (https://16bitweather.co)'

interface OpenMeteoGeoResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country_code?: string
  country?: string
  admin1?: string
  admin2?: string
}

interface OpenMeteoGeoResponse {
  results?: OpenMeteoGeoResult[]
}

interface ZippopotamPlace {
  'place name': string
  longitude: string
  latitude: string
  state: string
  'state abbreviation': string
}

interface ZippopotamResponse {
  'post code': string
  country: string
  'country abbreviation': string
  places: ZippopotamPlace[]
}

interface NominatimResult {
  lat: string
  lon: string
  display_name?: string
  address?: {
    city?: string
    town?: string
    village?: string
    suburb?: string
    hamlet?: string
    state?: string
    country?: string
    country_code?: string
    postcode?: string
  }
}

const mapOpenMeteoResult = (r: OpenMeteoGeoResult): GeocodingResponse => {
  const country = (r.country_code || '').toUpperCase() || 'XX'
  const stateAbbr = country === 'US' ? (toStateAbbr(r.admin1) ?? r.admin1) : r.admin1
  return {
    name: r.name,
    lat: r.latitude,
    lon: r.longitude,
    country,
    ...(stateAbbr ? { state: stateAbbr } : {}),
  }
}

const mapZippopotamPlace = (p: ZippopotamPlace, postcode?: string): GeocodingResponse => ({
  name: p['place name'],
  lat: parseFloat(p.latitude),
  lon: parseFloat(p.longitude),
  country: 'US',
  state: p['state abbreviation'],
  ...(postcode ? { postcode } : {}),
})

const mapNominatimResult = (r: NominatimResult): GeocodingResponse | null => {
  const lat = parseFloat(r.lat)
  const lon = parseFloat(r.lon)
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null

  const addr = r.address || {}
  const name = addr.city || addr.town || addr.village || addr.suburb || addr.hamlet || ''
  if (!name) return null

  const country = (addr.country_code || '').toUpperCase() || 'XX'
  const state = country === 'US'
    ? (toStateAbbr(addr.state) ?? addr.state)
    : addr.state

  return {
    name,
    lat,
    lon,
    country,
    ...(state ? { state } : {}),
    ...(addr.postcode ? { postcode: addr.postcode } : {}),
  }
}

/** Direct search: `San Ramon, CA` / `London, UK` / `Paris`. */
export async function searchGeocodingDirect(
  q: string,
  limit: number,
): Promise<GeocodingResponse[]> {
  const parts = q.split(',').map((s) => s.trim()).filter(Boolean)
  const cityName = parts[0] || q
  const filterHint = parts[1]?.toUpperCase() || null

  const url = `${OPEN_METEO_GEO}?name=${encodeURIComponent(cityName)}&count=10&language=en&format=json`
  const res = await fetchWithTimeout(url, { next: { revalidate: 3600 } })

  if (!res.ok) {
    throw new Error(`Open-Meteo geocoding error: ${res.status}`)
  }

  const data = (await res.json()) as OpenMeteoGeoResponse
  let results = data.results || []
  if (results.length === 0) return []

  if (filterHint) {
    const filtered = results.filter((r) => {
      const stateAbbr = toStateAbbr(r.admin1)
      if (stateAbbr && stateAbbr === filterHint) return true
      if (r.admin1 && r.admin1.toUpperCase() === filterHint) return true
      if (r.country_code && r.country_code.toUpperCase() === filterHint) return true
      if (filterHint === 'UK' && r.country_code?.toUpperCase() === 'GB') return true
      return false
    })
    if (filtered.length > 0) results = filtered
  }

  return results.slice(0, limit).map(mapOpenMeteoResult)
}

/** ZIP / postal lookup. US → Zippopotam; international → Nominatim. */
export async function lookupGeocodingZip(
  zipParam: string,
): Promise<GeocodingResponse | null> {
  const [rawZip, rawCountry] = zipParam.split(',').map((s) => s.trim())
  const zipCode = rawZip
  const country = (rawCountry || 'US').toUpperCase()

  if (!zipCode) return null

  if (country === 'US') {
    const stem = zipCode.split('-')[0]
    if (!/^\d{5}$/.test(stem)) return null

    const res = await fetchWithTimeout(`${ZIPPOPOTAM}/us/${stem}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null

    const data = (await res.json()) as ZippopotamResponse
    const place = data.places?.[0]
    if (!place) return null
    return mapZippopotamPlace(place, stem)
  }

  const url = `${NOMINATIM}/search?postalcode=${encodeURIComponent(zipCode)}&country=${encodeURIComponent(country)}&format=json&addressdetails=1&limit=1`
  const res = await fetchWithTimeout(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null

  const results = (await res.json()) as NominatimResult[]
  const first = results?.[0]
  if (!first) return null
  return mapNominatimResult(first)
}

/**
 * Resolve a free-text query the same way the geocoding route does for `?q=`:
 * bare US ZIP fast-path, then Open-Meteo direct search.
 */
export async function resolveGeocodingQuery(
  q: string,
  limit = 1,
): Promise<GeocodingResponse[]> {
  const trimmed = q.trim()
  if (!trimmed) return []

  if (/^\d{5}(?:-\d{4})?$/.test(trimmed)) {
    try {
      const zipResult = await lookupGeocodingZip(trimmed)
      if (zipResult) return [zipResult]
    } catch {
      // Fall through to direct search.
    }
  }

  return searchGeocodingDirect(trimmed, limit)
}

/** Reverse: lat/lon → place via Nominatim. */
export async function reverseGeocodingLookup(
  lat: number,
  lon: number,
): Promise<GeocodingResponse[]> {
  const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lon}&zoom=18&format=json&addressdetails=1`
  const res = await fetchWithTimeout(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 3600 },
  })
  if (!res.ok) {
    throw new Error(`Nominatim reverse error: ${res.status}`)
  }

  const data = (await res.json()) as NominatimResult
  const mapped = mapNominatimResult(data)
  return mapped ? [mapped] : []
}

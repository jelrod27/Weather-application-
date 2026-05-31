import { sanitizeLogValue } from "@/lib/sanitize-log"
/**
 * 16-Bit Weather Platform - Geocoding API Route
 *
 * Backed by Open-Meteo (direct search), Zippopotam.us (US ZIPs),
 * and Nominatim (international postal codes + reverse). No API key required.
 *
 * Response shape is preserved to match the legacy OpenWeatherMap `/geo/1.0`
 * shape so existing callers in lib/weather/weather-geocoding.ts, the stargazer
 * page, and the E2E fixtures do not need to change:
 *
 *   Direct + reverse: GeocodingResponse[] = [{ name, lat, lon, country, state? }]
 *   ZIP:              GeocodingResponse    = { name, lat, lon, country, state? }
 *   (yes, ZIP returns a single object — legacy OWM quirk the caller depends on.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimitRequest } from '@/lib/services/weather-rate-limiter'
import { toStateAbbr } from '@/lib/us-states'
import type { GeocodingResponse } from '@/lib/weather'

const OPEN_METEO_GEO = 'https://geocoding-api.open-meteo.com/v1/search'
const ZIPPOPOTAM = 'https://api.zippopotam.us'
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const USER_AGENT = '16BitWeather/1.0 (https://16bitweather.co)'

// Open-Meteo geocoding result shape (subset we care about).
interface OpenMeteoGeoResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country_code?: string
  country?: string
  admin1?: string // state/province
  admin2?: string // county
}

interface OpenMeteoGeoResponse {
  results?: OpenMeteoGeoResult[]
}

// Zippopotam response shape (US endpoint).
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

// Nominatim search/reverse response shape (subset).
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

/** Map an Open-Meteo direct search result into the legacy GeocodingResponse shape. */
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

/** Map a Zippopotam US place into the legacy GeocodingResponse shape.
 *  Zippopotam responses are keyed on the postcode the caller queried,
 *  which the route handler attaches via the `attachPostcode` helper. */
const mapZippopotamPlace = (p: ZippopotamPlace, postcode?: string): GeocodingResponse => ({
  name: p['place name'],
  lat: parseFloat(p.latitude),
  lon: parseFloat(p.longitude),
  country: 'US',
  state: p['state abbreviation'],
  ...(postcode ? { postcode } : {}),
})

/** Map a Nominatim result into the legacy GeocodingResponse shape. */
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

/**
 * Direct search branch: `?q=San Ramon, CA` or `?q=London, UK` or `?q=Paris`.
 * Uses Open-Meteo and filters by trailing comma-separated state/country hint.
 */
async function handleDirectSearch(q: string, limit: number): Promise<GeocodingResponse[]> {
  // Parse the query: "City" | "City, ST" | "City, Country".
  const parts = q.split(',').map((s) => s.trim()).filter(Boolean)
  const cityName = parts[0] || q
  const filterHint = parts[1]?.toUpperCase() || null

  const url = `${OPEN_METEO_GEO}?name=${encodeURIComponent(cityName)}&count=10&language=en&format=json`
  const res = await fetch(url, { next: { revalidate: 3600 } })

  if (!res.ok) {
    throw new Error(`Open-Meteo geocoding error: ${res.status}`)
  }

  const data = (await res.json()) as OpenMeteoGeoResponse
  let results = data.results || []
  if (results.length === 0) return []

  // If a filter was provided, prefer matches against state (US) or country.
  if (filterHint) {
    const filtered = results.filter((r) => {
      const stateAbbr = toStateAbbr(r.admin1)
      if (stateAbbr && stateAbbr === filterHint) return true
      if (r.admin1 && r.admin1.toUpperCase() === filterHint) return true
      if (r.country_code && r.country_code.toUpperCase() === filterHint) return true
      // Allow "UK" alias for GB.
      if (filterHint === 'UK' && r.country_code?.toUpperCase() === 'GB') return true
      return false
    })
    if (filtered.length > 0) results = filtered
  }

  return results.slice(0, limit).map(mapOpenMeteoResult)
}

/**
 * ZIP / postal branch. US → Zippopotam.us; international → Nominatim.
 * Returns a single object (not an array) to match legacy OWM zip shape.
 */
async function handleZipLookup(zipParam: string): Promise<GeocodingResponse | null> {
  const [rawZip, rawCountry] = zipParam.split(',').map((s) => s.trim())
  const zipCode = rawZip
  const country = (rawCountry || 'US').toUpperCase()

  if (!zipCode) return null

  if (country === 'US') {
    // Strip +4 suffix (Zippopotam only supports the 5-digit stem).
    const stem = zipCode.split('-')[0]
    if (!/^\d{5}$/.test(stem)) return null

    const res = await fetch(`${ZIPPOPOTAM}/us/${stem}`, {
      next: { revalidate: 86400 }, // ZIP → city is effectively immutable.
    })
    if (!res.ok) return null

    const data = (await res.json()) as ZippopotamResponse
    const place = data.places?.[0]
    if (!place) return null
    return mapZippopotamPlace(place, stem)
  }

  // International postal code via Nominatim.
  const url = `${NOMINATIM}/search?postalcode=${encodeURIComponent(zipCode)}&country=${encodeURIComponent(country)}&format=json&addressdetails=1&limit=1`
  const res = await fetch(url, {
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
 * Reverse branch: lat/lon → place. Uses Nominatim.
 * Returns an array of one result to match legacy OWM reverse shape.
 */
async function handleReverseLookup(lat: number, lon: number): Promise<GeocodingResponse[]> {
  // zoom=18 returns full street-level detail including `postcode`. zoom=14
  // tops out at the town/county level and omits the postcode, which would
  // break the "City, ST ZIP" header format on the dashboard.
  const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lon}&zoom=18&format=json&addressdetails=1`
  const res = await fetch(url, {
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

export async function GET(request: NextRequest) {
  try {
    // Check rate limit first
    const rateLimit = await rateLimitRequest(request)
    if (!rateLimit.allowed) {
      return rateLimit.response
    }

    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')
    const zip = searchParams.get('zip')
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const limitRaw = searchParams.get('limit') || '1'

    if (!q && !zip && !(lat && lon)) {
      return NextResponse.json(
        { error: 'Missing required parameter: q (location query), zip (ZIP code), or lat/lon' },
        { status: 400 }
      )
    }

    if (lat && lon) {
      const latNum = Number(lat)
      const lonNum = Number(lon)
      if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
        return NextResponse.json(
          { error: 'Latitude and longitude must be valid numbers' },
          { status: 400 }
        )
      }

      try {
        const results = await handleReverseLookup(latNum, lonNum)
        if (results.length === 0) {
          return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }
        return NextResponse.json(results, { headers: rateLimit.headers })
      } catch (err) {
        console.error('Reverse geocoding error:', sanitizeLogValue(err instanceof Error ? err.message : err))
        return NextResponse.json({ error: 'Reverse geocoding failed' }, { status: 502 })
      }
    }

    if (zip) {
      try {
        const result = await handleZipLookup(zip)
        if (!result) {
          return NextResponse.json({ error: 'ZIP code not found' }, { status: 404 })
        }
        return NextResponse.json(result, { headers: rateLimit.headers })
      } catch (err) {
        console.error('ZIP geocoding error:', sanitizeLogValue(err instanceof Error ? err.message : err))
        return NextResponse.json({ error: 'ZIP lookup failed' }, { status: 502 })
      }
    }

    // Direct search branch.
    const limit = parseInt(limitRaw, 10)
    if (isNaN(limit) || limit < 1 || limit > 5) {
      return NextResponse.json(
        { error: 'Limit must be a number between 1 and 5' },
        { status: 400 }
      )
    }

    // Reject coordinate-shaped queries up front. Coordinates belong on
    // ?lat=&lon= (reverse), not ?q= (direct search). Forwarding "37.74,-121.95"
    // to Open-Meteo would 404, masking the caller's bug. Be loud instead.
    if (/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(q!.trim())) {
      return NextResponse.json(
        { error: 'Coordinates must be supplied via lat/lon parameters, not q' },
        { status: 400 }
      )
    }

    // US ZIP fast path: a bare 5-digit (optionally +4) query is a US ZIP, not a
    // city name. Open-Meteo's name search does not resolve US ZIPs, so route it
    // through handleZipLookup (Zippopotam) and return an array to match the
    // direct-search contract. Mirrors the legacy /api/geocode route absorbed here.
    // On miss/error, fall through to direct search.
    const directQuery = q!.trim()
    if (/^\d{5}(?:-\d{4})?$/.test(directQuery)) {
      try {
        const zipResult = await handleZipLookup(directQuery)
        if (zipResult) {
          return NextResponse.json([zipResult], { headers: rateLimit.headers })
        }
      } catch (err) {
        console.error('Direct ZIP fast-path error:', sanitizeLogValue(err instanceof Error ? err.message : err))
        // Fall through to direct search.
      }
    }

    try {
      const results = await handleDirectSearch(q!, limit)
      if (results.length === 0) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 })
      }
      return NextResponse.json(results, { headers: rateLimit.headers })
    } catch (err) {
      console.error('Direct geocoding error:', sanitizeLogValue(err instanceof Error ? err.message : err))
      return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 502 })
    }
  } catch (error) {
    console.error('Geocoding API error:', error instanceof Error ? error.message : sanitizeLogValue(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

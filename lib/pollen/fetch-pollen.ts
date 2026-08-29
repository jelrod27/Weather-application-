/**
 * Server-side pollen fetch: Google Pollen when keyed, else Open-Meteo CAMS.
 * The HTTP route delegates here so dashboard/server weather never self-proxies.
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { fetchOpenMeteoAirQuality } from '@/lib/open-meteo'
import { mapOpenMeteoPollenHourly } from '@/lib/pollen/open-meteo-pollen'
import { normalizePollenCategories } from '@/lib/pollen/normalize-pollen-categories'
import { logRouteError } from '@/lib/error-utils'

export const UNAVAILABLE_POLLEN_BODY = {
  tree: { Tree: 'Unavailable' },
  grass: { Grass: 'Unavailable' },
  weed: { Weed: 'Unavailable' },
  source: 'unavailable' as const,
}

export type PollenFetchResult = {
  tree: Record<string, string>
  grass: Record<string, string>
  weed: Record<string, string>
  source: 'google' | 'open-meteo' | 'unavailable'
}

const TREE_PLANTS = [
  'MAPLE', 'ELM', 'COTTONWOOD', 'ALDER', 'BIRCH', 'ASH', 'PINE', 'OAK', 'JUNIPER',
]
const GRASS_PLANTS = ['GRAMINALES']
const WEED_PLANTS = ['RAGWEED', 'WEED']

function getPollenCategory(value: number): string {
  if (value === 0) return 'None'
  if (value <= 2) return 'Low'
  if (value <= 5) return 'Moderate'
  if (value <= 8) return 'High'
  return 'Very High'
}

interface PlantInfo {
  code?: string
  displayName?: string
  indexInfo?: { value?: number; category?: string }
}

interface PollenTypeInfo {
  code?: string
  indexInfo?: { value?: number; category?: string }
}

function categoryFromIndex(
  indexInfo?: { value?: number; category?: string },
): string | undefined {
  if (indexInfo?.category) return indexInfo.category
  if (typeof indexInfo?.value === 'number') {
    return getPollenCategory(indexInfo.value)
  }
  return undefined
}

function extractPlantCategories(
  plants: PlantInfo[],
  group: string[],
): Record<string, string> {
  const result: Record<string, string> = {}
  plants?.forEach((p) => {
    const code = p.code || p.displayName || ''
    if (group.some((type) => code.includes(type))) {
      const category = categoryFromIndex(p.indexInfo)
      if (category) result[p.displayName || code] = category
    }
  })
  return result
}

async function fetchGooglePollen(
  latitude: number,
  longitude: number,
  apiKey: string,
  signal?: AbortSignal,
): Promise<PollenFetchResult | null> {
  try {
    const googlePollenUrl =
      `https://pollen.googleapis.com/v1/forecast:lookup?key=${apiKey}` +
      `&location.latitude=${latitude}&location.longitude=${longitude}&days=1`

    const response = await fetchWithTimeout(googlePollenUrl, { signal })
    if (!response.ok) return null

    const data = await response.json()
    const dailyInfo = data.dailyInfo?.[0]
    if (!dailyInfo) return null

    const plantInfo: PlantInfo[] = dailyInfo.plantInfo || []
    const treeBreakdown = extractPlantCategories(plantInfo, TREE_PLANTS)
    const grassBreakdown = extractPlantCategories(plantInfo, GRASS_PLANTS)
    const weedBreakdown = extractPlantCategories(plantInfo, WEED_PLANTS)

    const pollenTypeTree: PollenTypeInfo | undefined = dailyInfo.pollenTypeInfo?.find(
      (p: PollenTypeInfo) => p.code === 'TREE',
    )
    const pollenTypeGrass: PollenTypeInfo | undefined = dailyInfo.pollenTypeInfo?.find(
      (p: PollenTypeInfo) => p.code === 'GRASS',
    )
    const pollenTypeWeed: PollenTypeInfo | undefined = dailyInfo.pollenTypeInfo?.find(
      (p: PollenTypeInfo) => p.code === 'WEED',
    )

    if (Object.keys(treeBreakdown).length === 0 && pollenTypeTree) {
      const category = categoryFromIndex(pollenTypeTree.indexInfo)
      if (category) treeBreakdown.Tree = category
    }
    if (Object.keys(grassBreakdown).length === 0 && pollenTypeGrass) {
      const category = categoryFromIndex(pollenTypeGrass.indexInfo)
      if (category) grassBreakdown.Grass = category
    }
    if (Object.keys(weedBreakdown).length === 0 && pollenTypeWeed) {
      const category = categoryFromIndex(pollenTypeWeed.indexInfo)
      if (category) weedBreakdown.Weed = category
    }

    const hasGoogleData =
      Object.keys(treeBreakdown).length > 0 ||
      Object.keys(grassBreakdown).length > 0 ||
      Object.keys(weedBreakdown).length > 0

    if (!hasGoogleData) return null

    const normalized = normalizePollenCategories(
      treeBreakdown,
      grassBreakdown,
      weedBreakdown,
    )
    return {
      tree: normalized.tree,
      grass: normalized.grass,
      weed: normalized.weed,
      source: 'google',
    }
  } catch (error) {
    // googlePollenUrl carries GOOGLE_POLLEN_API_KEY in its query string,
    // and an upstream fetch error can embed the request URL in its
    // message or stack. Report the shape of the failure rather than the
    // error object so the key cannot reach Sentry.
    logRouteError('pollen', new Error('Google Pollen request failed'), {
      upstream: 'pollen.googleapis.com',
      reason: error instanceof Error ? error.name : typeof error,
    })
    return null
  }
}

export async function fetchPollenForLocation(
  latitude: number,
  longitude: number,
  options?: { signal?: AbortSignal },
): Promise<PollenFetchResult> {
  const googlePollenApiKey = process.env.GOOGLE_POLLEN_API_KEY
  if (googlePollenApiKey) {
    const google = await fetchGooglePollen(
      latitude,
      longitude,
      googlePollenApiKey,
      options?.signal,
    )
    if (google) return google
  }

  try {
    const aq = await fetchOpenMeteoAirQuality(latitude, longitude)
    const mapped = mapOpenMeteoPollenHourly(aq.hourly, aq.utc_offset_seconds)
    if (mapped.source === 'open-meteo') {
      const normalized = normalizePollenCategories(mapped.tree, mapped.grass, mapped.weed)
      return {
        tree: normalized.tree,
        grass: normalized.grass,
        weed: normalized.weed,
        source: mapped.source,
      }
    }
    return {
      tree: mapped.tree,
      grass: mapped.grass,
      weed: mapped.weed,
      source: mapped.source,
    }
  } catch (error) {
    logRouteError('pollen', error)
    return UNAVAILABLE_POLLEN_BODY
  }
}

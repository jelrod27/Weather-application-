/**
 * Education encyclopedia entry registry — slugs, lookups, and featured detail pages.
 */

import { cloudDatabase } from '@/data/cloud-types'
import { weatherPhenomena } from '@/data/fun-facts'
import { weatherSystemsDatabase } from '@/data/weather-systems'
import type { CloudData } from '@/data/cloud-types'
import type { WeatherPhenomena } from '@/data/fun-facts'
import type { WeatherSystemData } from '@/data/weather-systems'
import { toEducationSlug } from '@/lib/education/slugs'

export type EducationEntryKind = 'weather-system' | 'cloud' | 'phenomenon'

export interface EducationEntryRef {
  kind: EducationEntryKind
  slug: string
  title: string
  summary: string
  href: string
}

/** Top 20 shareable detail pages (7 systems + 7 clouds + 6 phenomena). */
export const FEATURED_DETAIL_SLUGS: Record<EducationEntryKind, string[]> = {
  'weather-system': [
    'cyclones',
    'anticyclones',
    'warm-fronts',
    'cold-fronts',
    'jet-streams',
    'tropical-cyclones',
    'polar-vortex',
  ],
  cloud: [
    'cirrus',
    'cumulus',
    'cumulonimbus',
    'stratus',
    'nimbostratus',
    'altocumulus',
    'lenticular',
  ],
  phenomenon: [
    'ball-lightning',
    'thundersnow',
    'microbursts',
    'sun-dogs',
    'haboob',
    'sprites',
  ],
}

function systemSlug(system: WeatherSystemData): string {
  return toEducationSlug(system.name)
}

function cloudSlug(cloud: CloudData): string {
  return toEducationSlug(cloud.name)
}

export function getWeatherSystemBySlug(slug: string): WeatherSystemData | undefined {
  return weatherSystemsDatabase.find((s) => systemSlug(s) === slug)
}

export function getCloudBySlug(slug: string): CloudData | undefined {
  return cloudDatabase.find((c) => cloudSlug(c) === slug)
}

export function getPhenomenonBySlug(slug: string): WeatherPhenomena | undefined {
  return weatherPhenomena.find((p) => p.id === slug)
}

export function getEducationDetailHref(kind: EducationEntryKind, slug: string): string {
  const segment =
    kind === 'weather-system' ? 'weather-systems' : kind === 'cloud' ? 'cloud-types' : 'phenomena'
  return `/education/${segment}/${slug}`
}

export function getFeaturedDetailEntries(): EducationEntryRef[] {
  const systems = FEATURED_DETAIL_SLUGS['weather-system']
    .map((slug) => {
      const entry = getWeatherSystemBySlug(slug)
      if (!entry) return null
      return {
        kind: 'weather-system' as const,
        slug,
        title: entry.name,
        summary: entry.description16bit,
        href: getEducationDetailHref('weather-system', slug),
      }
    })
    .filter(Boolean) as EducationEntryRef[]

  const clouds = FEATURED_DETAIL_SLUGS.cloud
    .map((slug) => {
      const entry = getCloudBySlug(slug)
      if (!entry) return null
      return {
        kind: 'cloud' as const,
        slug,
        title: entry.name,
        summary: entry.description16bit,
        href: getEducationDetailHref('cloud', slug),
      }
    })
    .filter(Boolean) as EducationEntryRef[]

  const phenomena = FEATURED_DETAIL_SLUGS.phenomenon
    .map((slug) => {
      const entry = getPhenomenonBySlug(slug)
      if (!entry) return null
      return {
        kind: 'phenomenon' as const,
        slug,
        title: entry.name,
        summary: entry.description,
        href: getEducationDetailHref('phenomenon', slug),
      }
    })
    .filter(Boolean) as EducationEntryRef[]

  return [...systems, ...clouds, ...phenomena]
}

/** All statically published shareable guide pages (for sitemap parity and internal linking). */
export function getShareableGuideEntries(): EducationEntryRef[] {
  const systems = getAllWeatherSystemSlugs()
    .map((slug) => {
      const entry = getWeatherSystemBySlug(slug)
      if (!entry) return null
      return {
        kind: 'weather-system' as const,
        slug,
        title: entry.name,
        summary: entry.description16bit,
        href: getEducationDetailHref('weather-system', slug),
      }
    })
    .filter(Boolean) as EducationEntryRef[]

  return [...systems, ...getFeaturedDetailEntries().filter((e) => e.kind !== 'weather-system')]
}

export function countEncyclopediaEntries(): number {
  return weatherSystemsDatabase.length + cloudDatabase.length + weatherPhenomena.length
}

/** Slugs for every weather system encyclopedia entry (shareable detail pages). */
export function getAllWeatherSystemSlugs(): string[] {
  return weatherSystemsDatabase.map((system) => systemSlug(system))
}

/** Total shareable /education/* detail guide URLs we statically publish. */
export function countShareableGuidePages(): number {
  return (
    getAllWeatherSystemSlugs().length +
    FEATURED_DETAIL_SLUGS.cloud.length +
    FEATURED_DETAIL_SLUGS.phenomenon.length
  )
}

export { systemSlug, cloudSlug }

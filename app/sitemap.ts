import type { MetadataRoute } from 'next'
import deepSkyCatalog from '@/data/deep-sky-catalog.json'
import { cityData as cityMetadata } from '@/lib/cities'
import { getAllPosts } from '@/lib/blog'
import { SPACE_WEATHER_INTENTS, intentHref } from '@/lib/space-weather/intents'
import { getGuideLastModified } from '@/lib/education/content'
import {
  FEATURED_DETAIL_SLUGS,
  getAllWeatherSystemSlugs,
  getEducationDetailHref,
  type EducationEntryKind,
} from '@/lib/education/entries'
import {
  startOfUtcDay,
  startOfUtcHour,
  startOfUtcMonth,
  startOfUtcWeek,
} from '@/lib/seo/sitemap-lastmod'
import type { DeepSkyObject } from '@/lib/stargazer/types'

/**
 * lastmod describes when the server-rendered HTML changed, not when the live
 * data behind a page did. Tool pages fetch their data client-side, so their
 * HTML only changes on deploy; claiming an hourly change there teaches Google
 * to ignore lastmod site-wide. Only /space-weather stamps live values into
 * its HTML.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.16bitweather.co'
  const hourly = startOfUtcHour()
  const daily = startOfUtcDay()
  const weekly = startOfUtcWeek()
  const monthly = startOfUtcMonth()

  try {
    let blogPosts: MetadataRoute.Sitemap = []
    try {
      blogPosts = getAllPosts().map(post => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }))
    } catch {
      console.error('[sitemap] Failed to load blog posts')
    }

    const latestPostDate = blogPosts[0]?.lastModified instanceof Date
      ? blogPosts[0].lastModified
      : weekly

    const staticPages: MetadataRoute.Sitemap = [
      { url: baseUrl, lastModified: weekly, changeFrequency: 'weekly', priority: 1 },
      { url: `${baseUrl}/about`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.6 },

      { url: `${baseUrl}/radar`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.9 },
      { url: `${baseUrl}/severe`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.9 },
      { url: `${baseUrl}/warnings`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.95 },
      { url: `${baseUrl}/alerts`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.9 },
      { url: `${baseUrl}/space-weather`, lastModified: hourly, changeFrequency: 'hourly', priority: 0.9 },
      { url: `${baseUrl}/stargazer`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.85 },
      { url: `${baseUrl}/stargazer/objects`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.6 },
      { url: `${baseUrl}/tropical`, lastModified: daily, changeFrequency: 'daily', priority: 0.8 },
      { url: `${baseUrl}/aviation`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.8 },
      { url: `${baseUrl}/travel`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.8 },
      { url: `${baseUrl}/winter`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.7 },
      { url: `${baseUrl}/earth-sciences`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.8 },

      { url: `${baseUrl}/blog`, lastModified: latestPostDate, changeFrequency: 'weekly', priority: 0.9 },
      { url: `${baseUrl}/news`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.8 },
      { url: `${baseUrl}/education`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.8 },
      { url: `${baseUrl}/cloud-types`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.8 },
      { url: `${baseUrl}/weather-systems`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.8 },
      { url: `${baseUrl}/fun-facts`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.7 },
      { url: `${baseUrl}/education/glossary`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.7 },
    ]

    // A Guide's prose carries its own review or generation date; an Entry
    // without a Guide has nothing that changes, so it keeps the monthly bucket.
    const educationDetailPage = (kind: EducationEntryKind, slug: string) => ({
      url: `${baseUrl}${getEducationDetailHref(kind, slug)}`,
      lastModified: getGuideLastModified(kind, slug) ?? monthly,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    })

    const educationDetailPages: MetadataRoute.Sitemap = [
      ...getAllWeatherSystemSlugs().map((slug) => educationDetailPage('weather-system', slug)),
      ...FEATURED_DETAIL_SLUGS.cloud.map((slug) => educationDetailPage('cloud', slug)),
      ...FEATURED_DETAIL_SLUGS.phenomenon.map((slug) => educationDetailPage('phenomenon', slug)),
    ]

    // Each intent page stamps its own live SWPC reading into the HTML, so they
    // share /space-weather's hourly bucket rather than the static-shell monthly.
    for (const intent of SPACE_WEATHER_INTENTS) {
      staticPages.push({
        url: `${baseUrl}${intentHref(intent.slug)}`,
        lastModified: hourly,
        changeFrequency: 'hourly',
        priority: 0.8,
      })
    }

    // The directory hub: the only indexable page that links every city.
    staticPages.push({
      url: `${baseUrl}/weather`,
      lastModified: monthly,
      changeFrequency: 'monthly',
      priority: 0.8,
    })

    // Climate copy is static; only the client-fetched forecast changes.
    const cityPages: MetadataRoute.Sitemap = Object.keys(cityMetadata || {}).map(citySlug => ({
      url: `${baseUrl}/weather/${citySlug}`,
      lastModified: monthly,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    }))

    // Deep-sky object pages already rank for object names; without the sitemap
    // their only inlinks were a client-rendered highlights list.
    const deepSkyPages: MetadataRoute.Sitemap = (deepSkyCatalog as DeepSkyObject[]).map(obj => ({
      url: `${baseUrl}/stargazer/objects/${obj.id}`,
      lastModified: monthly,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    }))

    return [...staticPages, ...educationDetailPages, ...cityPages, ...blogPosts, ...deepSkyPages]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return [
      { url: baseUrl, lastModified: startOfUtcWeek(), changeFrequency: 'weekly' as const, priority: 1 },
      { url: `${baseUrl}/about`, lastModified: startOfUtcMonth(), changeFrequency: 'monthly' as const, priority: 0.8 },
    ]
  }
}

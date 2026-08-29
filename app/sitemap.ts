import type { MetadataRoute } from 'next'
import { cityData as cityMetadata } from '@/lib/cities'
import { getAllPosts } from '@/lib/blog'
import { FEATURED_DETAIL_SLUGS, getAllWeatherSystemSlugs, getEducationDetailHref } from '@/lib/education/entries'
import {
  startOfUtcDay,
  startOfUtcHour,
  startOfUtcMonth,
  startOfUtcWeek,
} from '@/lib/seo/sitemap-lastmod'

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
      { url: baseUrl, lastModified: daily, changeFrequency: 'daily', priority: 1 },
      { url: `${baseUrl}/about`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.6 },

      { url: `${baseUrl}/radar`, lastModified: hourly, changeFrequency: 'hourly', priority: 0.9 },
      { url: `${baseUrl}/severe`, lastModified: hourly, changeFrequency: 'hourly', priority: 0.9 },
      { url: `${baseUrl}/warnings`, lastModified: hourly, changeFrequency: 'hourly', priority: 0.95 },
      { url: `${baseUrl}/alerts`, lastModified: daily, changeFrequency: 'daily', priority: 0.9 },
      { url: `${baseUrl}/space-weather`, lastModified: hourly, changeFrequency: 'hourly', priority: 0.9 },
      { url: `${baseUrl}/stargazer`, lastModified: hourly, changeFrequency: 'hourly', priority: 0.85 },
      { url: `${baseUrl}/tropical`, lastModified: daily, changeFrequency: 'daily', priority: 0.8 },
      { url: `${baseUrl}/aviation`, lastModified: hourly, changeFrequency: 'hourly', priority: 0.8 },
      { url: `${baseUrl}/travel`, lastModified: daily, changeFrequency: 'daily', priority: 0.8 },
      { url: `${baseUrl}/winter`, lastModified: daily, changeFrequency: 'daily', priority: 0.7 },
      { url: `${baseUrl}/earth-sciences`, lastModified: hourly, changeFrequency: 'hourly', priority: 0.8 },

      { url: `${baseUrl}/blog`, lastModified: latestPostDate, changeFrequency: 'weekly', priority: 0.9 },
      { url: `${baseUrl}/news`, lastModified: daily, changeFrequency: 'daily', priority: 0.8 },
      { url: `${baseUrl}/education`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.8 },
      { url: `${baseUrl}/cloud-types`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.8 },
      { url: `${baseUrl}/weather-systems`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.8 },
      { url: `${baseUrl}/fun-facts`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.7 },
      { url: `${baseUrl}/education/glossary`, lastModified: monthly, changeFrequency: 'monthly', priority: 0.7 },
    ]

    const educationDetailPages: MetadataRoute.Sitemap = [
      ...getAllWeatherSystemSlugs().map((slug) => ({
        url: `${baseUrl}${getEducationDetailHref('weather-system', slug)}`,
        lastModified: monthly,
        changeFrequency: 'monthly' as const,
        priority: 0.75,
      })),
      ...FEATURED_DETAIL_SLUGS.cloud.map((slug) => ({
        url: `${baseUrl}${getEducationDetailHref('cloud', slug)}`,
        lastModified: monthly,
        changeFrequency: 'monthly' as const,
        priority: 0.75,
      })),
      ...FEATURED_DETAIL_SLUGS.phenomenon.map((slug) => ({
        url: `${baseUrl}${getEducationDetailHref('phenomenon', slug)}`,
        lastModified: monthly,
        changeFrequency: 'monthly' as const,
        priority: 0.75,
      })),
    ]

    const cityPages: MetadataRoute.Sitemap = Object.keys(cityMetadata || {}).map(citySlug => ({
      url: `${baseUrl}/weather/${citySlug}`,
      lastModified: weekly,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }))

    // Deep-sky object pages stay indexable via internal links but are omitted
    // from the sitemap to focus crawl budget on city, education, and tool pages.

    return [...staticPages, ...educationDetailPages, ...cityPages, ...blogPosts]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return [
      { url: baseUrl, lastModified: startOfUtcDay(), changeFrequency: 'daily' as const, priority: 1 },
      { url: `${baseUrl}/about`, lastModified: startOfUtcMonth(), changeFrequency: 'monthly' as const, priority: 0.8 },
    ]
  }
}

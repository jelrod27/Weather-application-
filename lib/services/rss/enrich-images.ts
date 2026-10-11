/**
 * Post-parse image enrichment: USGS shakemaps, Open Graph photos, category stock art.
 */

import { createTtlCache } from '@/lib/cache/ttl-cache';
import { pickCategoryStockImage } from '@/lib/news/stock-images';
import { isoTimestamp } from '@/lib/news/visuals';
import { safeExternalUrl, upgradeFeedImageUrl } from '@/lib/safe-url';
import { resolveOgImage, shouldAttemptOgImage } from './resolve-og-image';
import type { NewsImage } from '@/lib/news/visuals';
import type { RSSItem } from './parse-feed';

const USGS_EVENT_ID = /earthquakes\/eventpage\/([a-z0-9]+)/i;
const USGS_DETAIL_CACHE = createTtlCache<NewsImage | null>({ ttlMs: 30 * 60 * 1000 });

export interface EnrichImagesOptions {
  /** Max items to enrich per aggregation (priority order preserved). */
  maxEnrich?: number;
  /** Parallel fetches. */
  concurrency?: number;
}

const DEFAULTS: Required<EnrichImagesOptions> = {
  maxEnrich: 24,
  concurrency: 6,
};

const USGS_EARTHQUAKE_SOURCES = new Set(['usgs-significant', 'usgs-m45', 'usgs-m25']);
const HAZARD_CATEGORIES = new Set(['severe', 'hurricanes', 'earthquakes', 'volcanoes']);

export async function enrichItemImages(
  items: RSSItem[],
  options: EnrichImagesOptions = {},
): Promise<RSSItem[]> {
  const { maxEnrich, concurrency } = { ...DEFAULTS, ...options };
  const result = items.map((item) => {
    // A feed image or OG thumbnail alone cannot establish hazard relevance.
    const image = item.sourceId === 'spc-outlooks' && item.image?.kind === 'product'
      ? item.image : HAZARD_CATEGORIES.has(item.category) ? undefined : item.image;
    return { ...item, image, imageUrl: image?.url };
  });
  const asyncTargets = result.filter((item) => !item.image &&
    (USGS_EARTHQUAKE_SOURCES.has(item.sourceId) || !HAZARD_CATEGORIES.has(item.category))).slice(0, maxEnrich);
  const resolved = new Map<string, NewsImage>();

  await mapWithConcurrency(asyncTargets, concurrency, async (item) => {
    const image = await resolveStoryImage(item);
    if (image) resolved.set(item.id, image);
  });

  for (const item of result) {
    if (item.image) continue;
    const stockSeed = item.category === 'volcanoes' ? (item.location ?? item.id) : item.title;
    const stock = pickCategoryStockImage(item.category, stockSeed);
    item.image = resolved.get(item.id) ?? (stock ? {
      url: stock.url, kind: 'reference', credit: stock.credit, sourceUrl: stock.url,
      alt: item.category === 'volcanoes' ? `Reference view of ${item.location}` : `${item.category} reference image`,
      caption: item.category === 'volcanoes'
        ? `Reference view of ${item.location} · Not a current eruption image`
        : 'Illustrative reference · Not an image of this event',
    } : undefined);
    item.imageUrl = item.image?.url;
  }

  return result;
}

async function resolveStoryImage(item: RSSItem): Promise<NewsImage | undefined> {
  if (USGS_EARTHQUAKE_SOURCES.has(item.sourceId)) {
    const shakemap = await resolveUsgsEarthquakeImage(item.url);
    if (shakemap) return shakemap;
  }

  if (HAZARD_CATEGORIES.has(item.category)) return undefined;

  // USGS elevated-volcano JSON items often share one daily notice URL, so OG
  // would return the same image for every peak. Skip OG and use name-keyed art.
  if (item.sourceId !== 'usgs-volcanoes' && shouldAttemptOgImage(item.url)) {
    const og = await resolveOgImage(item.url);
    if (og) return {
      url: og, kind: 'editorial', credit: `Via ${item.source}`, sourceUrl: item.url,
      alt: `Image supplied with ${item.title}`, caption: 'Publisher-supplied image',
    };
  }

  return undefined;
}

async function resolveUsgsEarthquakeImage(eventPageUrl: string): Promise<NewsImage | undefined> {
  let hostname: string;
  try {
    hostname = new URL(eventPageUrl).hostname;
  } catch {
    return undefined;
  }
  if (hostname !== 'earthquake.usgs.gov') return undefined;
  const match = eventPageUrl.match(USGS_EVENT_ID);
  if (!match?.[1]) return undefined;

  const eventId = match[1];
  // A cached `null` is a negative result, distinct from a miss (undefined).
  const cached = USGS_DETAIL_CACHE.get(eventId);
  if (cached !== undefined) {
    return cached ?? undefined;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  let resolved: NewsImage | null = null;

  try {
    const response = await fetch(
      `https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/${eventId}.geojson`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': '16-Bit Weather RSS Aggregator/1.0' },
        next: { revalidate: 1800 },
      },
    );
    if (!response.ok) {
      USGS_DETAIL_CACHE.set(eventId, null);
      return undefined;
    }

    const data = (await response.json()) as {
      id?: string;
      properties?: { products?: { shakemap?: Array<{ updateTime?: number; contents?: Record<string, { url?: string }> }> } };
    };
    const product = data.id === eventId ? data.properties?.products?.shakemap?.[0] : undefined;
    const contents = product?.contents;
    if (contents) {
      const preferredKeys = ['download/intensity.jpg', 'download/pga.jpg'];
      for (const key of preferredKeys) {
        const url = contents[key]?.url;
        const safe = url ? safeExternalUrl(upgradeFeedImageUrl(url)) : null;
        if (safe) {
          const meaning = key === 'download/intensity.jpg' ? 'Shaking intensity' : 'Peak ground acceleration';
          resolved = {
            url: safe, kind: 'product', credit: 'USGS ShakeMap', sourceUrl: eventPageUrl,
            alt: `USGS ${meaning.toLowerCase()} map for earthquake ${eventId}`,
            caption: `${meaning} · Earthquake ${eventId}`,
            issuedAt: product?.updateTime && Number.isFinite(product.updateTime)
              ? isoTimestamp(new Date(product.updateTime).toISOString()) : undefined,
          };
          break;
        }
      }
    }
  } catch {
    resolved = null;
  } finally {
    clearTimeout(timer);
  }

  USGS_DETAIL_CACHE.set(eventId, resolved);
  return resolved ?? undefined;
}

async function mapWithConcurrency<T>(
  list: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, list.length) }, async () => {
    while (index < list.length) {
      const current = list[index++];
      await fn(current);
    }
  });
  await Promise.all(workers);
}

/**
 * Post-parse image enrichment: USGS shakemaps, Open Graph photos, category stock art.
 */

import { pickCategoryStockImage, resolveNhcOutlookImage, resolveNwsAlertImage } from '@/lib/news/stock-images';
import type { RSSItem } from './rssAggregator';
import { resolveOgImage, shouldAttemptOgImage } from './resolve-og-image';
import { safeExternalUrl, upgradeFeedImageUrl } from '@/lib/safe-url';

const USGS_EVENT_ID = /earthquakes\/eventpage\/([a-z0-9]+)/i;
const USGS_DETAIL_CACHE = new Map<string, { url: string | null; expires: number }>();
const USGS_CACHE_TTL_MS = 30 * 60 * 1000;

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
const NHC_SOURCES = new Set(['nhc-atlantic', 'nhc-pacific']);
const NWS_ALERT_SOURCES = new Set(['nws-alerts']);

export async function enrichItemImages(
  items: RSSItem[],
  options: EnrichImagesOptions = {},
): Promise<RSSItem[]> {
  const { maxEnrich, concurrency } = { ...DEFAULTS, ...options };
  const result = items.map((item) => ({ ...item }));
  const asyncTargets = result.filter((item) => !item.imageUrl).slice(0, maxEnrich);
  const resolved = new Map<string, string>();

  await mapWithConcurrency(asyncTargets, concurrency, async (item) => {
    const imageUrl = await resolveStoryImage(item);
    if (imageUrl) resolved.set(item.id, imageUrl);
  });

  for (const item of result) {
    if (item.imageUrl) continue;
    const stockSeed = item.category === 'volcanoes' ? (item.location ?? item.id) : item.title;
    item.imageUrl = resolved.get(item.id)
      ?? pickCategoryStockImage(item.category, stockSeed, item.sourceId).url;
  }

  return result;
}

async function resolveStoryImage(item: RSSItem): Promise<string | undefined> {
  if (USGS_EARTHQUAKE_SOURCES.has(item.sourceId)) {
    const shakemap = await resolveUsgsEarthquakeImage(item.url);
    if (shakemap) return shakemap;
  }

  if (NHC_SOURCES.has(item.sourceId)) {
    const outlook = resolveNhcOutlookImage(item);
    if (outlook) return outlook;
  }

  if (NWS_ALERT_SOURCES.has(item.sourceId)) {
    return resolveNwsAlertImage(item);
  }

  // USGS elevated-volcano JSON items often share one daily notice URL, so OG
  // would return the same image for every peak. Skip OG and use name-keyed art.
  if (item.sourceId !== 'usgs-volcanoes' && shouldAttemptOgImage(item.url)) {
    const og = await resolveOgImage(item.url);
    if (og) return og;
  }

  return undefined;
}

async function resolveUsgsEarthquakeImage(eventPageUrl: string): Promise<string | undefined> {
  const match = eventPageUrl.match(USGS_EVENT_ID);
  if (!match?.[1]) return undefined;

  const eventId = match[1];
  const cached = USGS_DETAIL_CACHE.get(eventId);
  if (cached && cached.expires > Date.now()) {
    return cached.url ?? undefined;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  let resolved: string | null = null;

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
      USGS_DETAIL_CACHE.set(eventId, { url: null, expires: Date.now() + USGS_CACHE_TTL_MS });
      return undefined;
    }

    const data = (await response.json()) as {
      properties?: { products?: { shakemap?: Array<{ contents?: Record<string, { url?: string }> }> } };
    };
    const contents = data.properties?.products?.shakemap?.[0]?.contents;
    if (contents) {
      const preferredKeys = ['download/intensity.jpg', 'download/pin-thumbnail.png', 'download/pga.jpg'];
      for (const key of preferredKeys) {
        const url = contents[key]?.url;
        const safe = url ? safeExternalUrl(upgradeFeedImageUrl(url)) : null;
        if (safe) {
          resolved = safe;
          break;
        }
      }
    }
  } catch {
    resolved = null;
  } finally {
    clearTimeout(timer);
  }

  USGS_DETAIL_CACHE.set(eventId, { url: resolved, expires: Date.now() + USGS_CACHE_TTL_MS });
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

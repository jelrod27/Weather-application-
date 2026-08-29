/**
 * In-memory aggregation cache, CDN Cache-Control tiers, and feed orchestration.
 */

import { createTtlCache } from '@/lib/cache/ttl-cache';
import {
  selectFeaturedItem,
  selectHappeningNow,
} from '@/lib/news/rails';
import { CATEGORY_CONFIG, FEED_SOURCES, getEnabledSourceNames, type FeedCategory } from './feedSources';
import { enrichItemImages } from './enrich-images';
import { fetchFeed, reportFeedHealth } from './fetch-feed';
import { PRIORITY_ORDER, deduplicateItems, type RSSItem } from './parse-feed';

export interface AggregatedResult {
  items: RSSItem[];
  happeningNow: RSSItem[];
  featured: RSSItem | null;
  stats: {
    total: number;
    byCategory: Record<FeedCategory, number>;
    bySource: Record<string, number>;
    errors: string[];
    enabledSources: string[];
  };
  lastUpdated: Date;
}

// In-memory cache.
// Best-effort warm-instance optimization only: the in-memory map does not
// reliably persist across serverless invocations, so the per-feed
// `next.revalidate` and the CDN `Cache-Control` (see cacheControlForCategories)
// are the real cache. Kept short (5 min) to match the Fast tier so severe
// alerts stay fresh on a warm instance.
const cache = createTtlCache<AggregatedResult>({ ttlMs: 5 * 60 * 1000 });

/**
 * Per-category freshness tiers (PRD §9). Severe/hurricanes must stay near
 * real-time; science/climate move slowly. The route picks the *minimum* tier
 * present in the requested categories so a mixed/"all" request keeps the
 * fastest content fresh.
 */
type CacheTier = 'fast' | 'medium' | 'slow';

const CATEGORY_TIERS: Record<FeedCategory, CacheTier> = {
  severe: 'fast',
  hurricanes: 'fast',
  earthquakes: 'medium',
  volcanoes: 'medium',
  space: 'medium',
  climate: 'slow',
  science: 'slow',
};

const TIER_CACHE_CONTROL: Record<CacheTier, string> = {
  fast: 'public, s-maxage=300, stale-while-revalidate=900',
  medium: 'public, s-maxage=1800, stale-while-revalidate=3600',
  slow: 'public, s-maxage=21600, stale-while-revalidate=43200',
};

/**
 * Build the route Cache-Control header for a set of requested categories.
 * Returns the fastest (smallest s-maxage) tier present; defaults to Fast when
 * no categories are specified (the "all" request) so severe alerts don't get
 * pinned behind a 6h CDN cache.
 */
export function cacheControlForCategories(categories?: FeedCategory[]): string {
  const requested = categories && categories.length > 0
    ? categories
    : (Object.keys(CATEGORY_TIERS) as FeedCategory[]);
  const tiers = requested.map((c) => CATEGORY_TIERS[c]).filter(Boolean);
  if (tiers.includes('fast')) return TIER_CACHE_CONTROL.fast;
  if (tiers.includes('medium')) return TIER_CACHE_CONTROL.medium;
  return TIER_CACHE_CONTROL.slow;
}

/**
 * Main aggregation function
 */
export async function aggregateFeeds(options: {
  categories?: FeedCategory[];
  maxItems?: number;
  maxAge?: number; // hours
} = {}): Promise<AggregatedResult> {
  const { categories, maxItems = 50, maxAge = 72 } = options;

  // Check cache
  const cacheKey = JSON.stringify({ categories, maxItems, maxAge });
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Filter feeds by category if specified
  const feeds = categories
    ? FEED_SOURCES.filter(f => f.enabled && categories.includes(f.category))
    : FEED_SOURCES.filter(f => f.enabled);

  // Fetch all feeds in parallel
  const results = await Promise.allSettled(feeds.map(fetchFeed));

  // Collect items and errors
  let allItems: RSSItem[] = [];
  const errors: string[] = [];
  const bySource: Record<string, number> = {};

  results.forEach((result, index) => {
    const feed = feeds[index];
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
      bySource[feed.name] = result.value.length;
      // Fetched OK but produced no items: low-noise breadcrumb only. fetchFeed
      // swallows real fetch errors (returns []), so this also covers the case
      // where an HTTP 200 returned content the parser couldn't map.
      if (result.value.length === 0) {
        reportFeedHealth(feed, 'parsed 0 items', 'empty-parse');
      }
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push(`${feed.name}: ${reason}`);
      bySource[feed.name] = 0;
      reportFeedHealth(feed, reason, 'fetch-error');
    }
  });

  // Filter by age. Exempt the USGS elevated-volcanoes source: that endpoint
  // returns only *currently* elevated volcanoes, but each item's timestamp is
  // its last notice's send time (sent_utc), which can lag well behind the age
  // window for a persistent WATCH/WARNING. Aging those out would hide active
  // hazards. We keep the real sent_utc (so card "time ago" and the Happening
  // Now rail stay honest) and just skip the cutoff for this source.
  const cutoff = Date.now() - maxAge * 60 * 60 * 1000;
  allItems = allItems.filter(
    (item) => item.sourceId === 'usgs-volcanoes' || item.timestamp.getTime() >= cutoff
  );

  // Deduplicate
  allItems = deduplicateItems(allItems);

  // Sort by priority then timestamp
  allItems.sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  // Limit items, then enrich imagery (OG/USGS/stock) so cards feel like a news site.
  allItems = allItems.slice(0, maxItems);
  allItems = await enrichItemImages(allItems);

  const happeningNow = selectHappeningNow(allItems);
  const featured = selectFeaturedItem(allItems, happeningNow);

  // Calculate stats by category
  const byCategory: Record<FeedCategory, number> = {
    earthquakes: 0,
    volcanoes: 0,
    space: 0,
    climate: 0,
    severe: 0,
    science: 0,
    hurricanes: 0,
  };
  allItems.forEach(item => {
    byCategory[item.category]++;
  });

  const result: AggregatedResult = {
    items: allItems,
    happeningNow,
    featured,
    stats: {
      total: allItems.length,
      byCategory,
      bySource,
      errors,
      enabledSources: getEnabledSourceNames(),
    },
    lastUpdated: new Date(),
  };

  // Cache result
  cache.set(cacheKey, result);

  return result;
}

/**
 * Get featured item (highest priority, most recent)
 * Excludes hurricanes category from featured since tropical season is limited
 */
export async function getFeaturedItem(): Promise<RSSItem | null> {
  const result = await aggregateFeeds({ maxItems: 20, maxAge: 24 });
  return result.featured;
}

/**
 * Clear the cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get category configuration
 */
export function getCategoryConfig() {
  return CATEGORY_CONFIG;
}

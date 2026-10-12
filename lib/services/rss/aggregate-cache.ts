/**
 * Source snapshot orchestration and per-response lifecycle evaluation.
 */

import {
  selectFeaturedItem,
  selectHappeningNow,
} from '@/lib/news/rails';
import { projectNewsSnapshot } from '@/lib/news/snapshot';
import { CATEGORY_CONFIG, FEED_SOURCES, type FeedCategory } from './feedSources';
import { enrichItemImages } from './enrich-images';
import { clearFeedSnapshots, fetchFeed } from './fetch-feed';
import { PRIORITY_ORDER, deduplicateItems, type RSSItem } from './parse-feed';
import type { NewsSourceHealth } from '@/lib/news/types';

export interface AggregatedResult {
  items: RSSItem[];
  happeningNow: RSSItem[];
  featured: RSSItem | null;
  delayedItems: RSSItem[];
  sources: NewsSourceHealth[];
  stats: {
    total: number;
    byCategory: Record<FeedCategory, number>;
    bySource: Record<string, number>;
    errors: string[];
    enabledSources: string[];
    available: number;
    truncated: boolean;
  };
  lastUpdated: Date;
}

/** Lifecycle is evaluated per response; only source snapshots are cached. */
export function cacheControlForCategories(_categories?: FeedCategory[]): string {
  return 'no-store';
}

/**
 * Main aggregation function
 */
interface AggregateOptions {
  categories?: FeedCategory[];
  maxItems?: number;
  maxAge?: number; // hours
}

export async function aggregateFeeds(options: AggregateOptions = {}): Promise<AggregatedResult> {
  const { categories, maxItems = 50, maxAge = 72 } = options;

  // Filter feeds by category if specified
  const feeds = categories
    ? FEED_SOURCES.filter(f => f.enabled && categories.includes(f.category))
    : FEED_SOURCES.filter(f => f.enabled);

  // Fetch all feeds in parallel
  const results = await Promise.all(feeds.map(fetchFeed));

  // Collect items and errors
  let allItems: RSSItem[] = [];
  const bySource: Record<string, number> = {};
  let sources: NewsSourceHealth[] = [];

  results.forEach((result, index) => {
    const feed = feeds[index];
    allItems.push(...result.items);
    sources.push(result.health);
    bySource[feed.name] = result.items.length;
  });

  // Keep old issue dates from NWS and volcano inventories. Source freshness
  // controls their placement; an old bulletin does not prove a current hazard.
  const cutoff = Date.now() - maxAge * 60 * 60 * 1000;
  allItems = allItems.filter(
    (item) => item.sourceId === 'usgs-volcanoes' || item.sourceId === 'nws-alerts' || item.timestamp.getTime() >= cutoff
  );

  // Deduplicate
  allItems = deduplicateItems(allItems);

  // Sort by priority then timestamp
  allItems.sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const available = allItems.length;
  const candidates = projectNewsSnapshot(allItems, sources);
  // Reserve the active lane before the cap; newer outlooks must not displace it.
  const activeWarnings = selectHappeningNow(candidates.items).slice(0, maxItems);
  const activeIds = new Set(activeWarnings.map(item => item.id));
  const currentItems = [...activeWarnings, ...candidates.items.filter(item => !activeIds.has(item.id))].slice(0, maxItems);
  // Enrich only bounded results, keeping delayed context separate from current slots.
  const enriched = await Promise.all([
    enrichItemImages(currentItems),
    enrichItemImages(candidates.delayedItems.slice(0, maxItems)),
  ]);
  // Image lookups can take time; recheck lifecycle before returning the response.
  const projected = projectNewsSnapshot([...enriched[0], ...enriched[1]], candidates.sources);
  allItems = projected.items;
  const delayedItems = projected.delayedItems;
  sources = projected.sources;

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
    delayedItems,
    sources,
    stats: {
      total: allItems.length,
      byCategory,
      bySource,
      errors: sources.filter(source => source.state !== 'fresh').map(source => `${source.name}: ${source.state}`),
      enabledSources: feeds.map(feed => feed.name),
      available,
      truncated: available > allItems.length + delayedItems.length || sources.some(source => source.truncated),
    },
    lastUpdated: new Date(),
  };

  return result;
}

/**
 * Clear the cache
 */
export function clearCache(): void {
  clearFeedSnapshots();
}

/**
 * Get category configuration
 */
export function getCategoryConfig() {
  return CATEGORY_CONFIG;
}

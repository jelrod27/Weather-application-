/**
 * 16-Bit Weather Platform - RSS Aggregator Service
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Server-side RSS feed fetching, parsing, and aggregation
 */

import * as Sentry from '@sentry/nextjs';
import { FEED_SOURCES, FeedSource, FeedCategory, CATEGORY_CONFIG } from './feedSources';
import { decodeHtmlEntities } from './html-utils';
import { safeExternalUrl } from '@/lib/safe-url';

export interface RSSItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  sourceId: string;
  category: FeedCategory;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  imageUrl?: string;
  author?: string;
  location?: string;
  magnitude?: number; // For earthquakes
  depth?: number; // For earthquakes (km)
}

export interface AggregatedResult {
  items: RSSItem[];
  stats: {
    total: number;
    byCategory: Record<FeedCategory, number>;
    bySource: Record<string, number>;
    errors: string[];
  };
  lastUpdated: Date;
}

// In-memory cache
const cache = new Map<string, { data: AggregatedResult; timestamp: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours (2x daily refresh)

/**
 * Simple hash function for generating unique IDs
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to base36 and ensure positive
  return Math.abs(hash).toString(36);
}

/**
 * Report an unhealthy feed to Sentry so a dead source is visible within one
 * refresh cycle instead of silently emptying its category (see PRD §12 / G3 —
 * this is what the decommissioned NWS alerts feed lacked).
 *
 * Real fetch/HTTP/timeout failures emit a warning-level message (creates an
 * issue). A feed that fetched OK but parsed to zero items emits a breadcrumb
 * only — high-priority feeds like nws-alerts can legitimately be empty during
 * calm weather, so we avoid raising a noisy issue for that case.
 */
function reportFeedHealth(
  source: FeedSource,
  reason: string,
  kind: 'fetch-error' | 'empty-parse'
): void {
  Sentry.addBreadcrumb({
    category: 'news.feed',
    level: 'warning',
    message: `feed unhealthy (${kind}): ${source.id}`,
    data: { sourceId: source.id, category: source.category, reason },
  });

  if (kind === 'fetch-error' && source.priority === 'high') {
    Sentry.captureMessage('[news] high-priority feed down', {
      level: 'warning',
      tags: { context: 'news', sourceId: source.id },
      extra: { source: source.id, category: source.category, reason },
    });
  }
}

/**
 * Fetch and parse a single RSS/Atom feed
 */
async function fetchFeed(source: FeedSource): Promise<RSSItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': '16-Bit Weather RSS Aggregator/1.0',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
      next: { revalidate: source.refreshInterval * 60 },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();

    // Parse based on format
    if (source.format === 'atom') {
      return parseAtomFeed(text, source);
    } else {
      return parseRSSFeed(text, source);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // [news] context prefix per CLAUDE.md logging convention.
    console.error(`[news] feed fetch failed: ${source.id}`, reason);
    reportFeedHealth(source, reason, 'fetch-error');
    return [];
  }
}

/**
 * Parse RSS 2.0 feed
 */
function parseRSSFeed(xml: string, source: FeedSource): RSSItem[] {
  const items: RSSItem[] = [];

  // Extract items using regex (more reliable than DOMParser in Node)
  const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];

  for (let i = 0; i < Math.min(itemMatches.length, 20); i++) {
    const itemXml = itemMatches[i];
    try {
      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link') || extractTag(itemXml, 'guid');
      const description = extractTag(itemXml, 'description') || extractTag(itemXml, 'content:encoded');
      const pubDate = extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'dc:date');
      const author = extractTag(itemXml, 'author') || extractTag(itemXml, 'dc:creator');

      // Extract image from enclosure or media:content
      let imageUrl = extractAttribute(itemXml, 'enclosure', 'url');
      if (!imageUrl) {
        imageUrl = extractAttribute(itemXml, 'media:content', 'url');
      }
      if (!imageUrl) {
        // Try to extract from description
        const imgMatch = description?.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) imageUrl = imgMatch[1];
      }

      // Drop items whose link or image URL isn't an http(s) URL.
      // Stops `javascript:` and other URI schemes from reaching renderers.
      const safeLink = safeExternalUrl(link);
      const safeImage = imageUrl ? safeExternalUrl(imageUrl) : null;
      if (title && safeLink) {
        // Create unique ID using hash of full URL + index
        const uniqueId = `${source.id}-${simpleHash(safeLink + i.toString())}-${i}`;
        items.push({
          id: uniqueId,
          title: cleanHtml(title),
          description: cleanHtml(description || '').slice(0, 300),
          url: safeLink,
          source: source.name,
          sourceId: source.id,
          category: source.category,
          priority: source.priority,
          timestamp: pubDate ? new Date(pubDate) : new Date(),
          imageUrl: safeImage || undefined,
          author: author ? cleanHtml(author) : undefined,
        });
      }
    } catch {
      // Skip malformed items
    }
  }

  return items;
}

/**
 * Parse Atom feed (used by USGS earthquakes)
 */
function parseAtomFeed(xml: string, source: FeedSource): RSSItem[] {
  const items: RSSItem[] = [];

  // Extract entries
  const entryMatches = xml.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];

  for (let i = 0; i < Math.min(entryMatches.length, 20); i++) {
    const entryXml = entryMatches[i];
    try {
      const title = extractTag(entryXml, 'title');
      const link = extractAttribute(entryXml, 'link', 'href') || extractTag(entryXml, 'id');
      const summary = extractTag(entryXml, 'summary') || extractTag(entryXml, 'content');
      const updated = extractTag(entryXml, 'updated') || extractTag(entryXml, 'published');
      const author = extractTag(entryXml, 'name'); // Inside <author>

      // For USGS earthquake feeds, extract magnitude from title
      let magnitude: number | undefined;
      let depth: number | undefined;
      let location: string | undefined;

      if (source.category === 'earthquakes' && title) {
        // Title format: "M 5.2 - 10 km NE of City, Country"
        const magMatch = title.match(/^M\s*([\d.]+)/);
        if (magMatch) magnitude = parseFloat(magMatch[1]);

        const locMatch = title.match(/- (.+)$/);
        if (locMatch) location = locMatch[1];

        // Try to get depth from summary/description
        const depthMatch = summary?.match(/Depth[:\s]*([\d.]+)\s*km/i);
        if (depthMatch) depth = parseFloat(depthMatch[1]);
      }

      // Same scheme guard as the RSS branch above.
      const safeLink = safeExternalUrl(link);
      if (title && safeLink) {
        // Create unique ID using hash of full URL + index
        const uniqueId = `${source.id}-${simpleHash(safeLink + i.toString())}-${i}`;
        items.push({
          id: uniqueId,
          title: cleanHtml(title),
          description: cleanHtml(summary || '').slice(0, 300),
          url: safeLink,
          source: source.name,
          sourceId: source.id,
          category: source.category,
          priority: determinePriority(source, magnitude),
          timestamp: updated ? new Date(updated) : new Date(),
          author: author ? cleanHtml(author) : undefined,
          location,
          magnitude,
          depth,
        });
      }
    } catch {
      // Skip malformed entries
    }
  }

  return items;
}

/**
 * Determine priority based on content (e.g., earthquake magnitude)
 */
function determinePriority(source: FeedSource, magnitude?: number): 'high' | 'medium' | 'low' {
  if (source.category === 'earthquakes' && magnitude) {
    if (magnitude >= 6.0) return 'high';
    if (magnitude >= 5.0) return 'medium';
    return 'low';
  }
  return source.priority;
}

/**
 * Extract text content from XML tag
 */
function extractTag(xml: string, tagName: string): string | null {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle regular content
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract attribute from XML tag
 */
function extractAttribute(xml: string, tagName: string, attrName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*${attrName}=["']([^"']+)["']`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

/**
 * Clean HTML tags and decode entities
 */
function cleanHtml(html: string): string {
  return decodeHtmlEntities(html);
}

/**
 * Deduplicate items based on similar titles
 */
function deduplicateItems(items: RSSItem[]): RSSItem[] {
  const seen = new Map<string, RSSItem>();

  for (const item of items) {
    // Create a normalized key from title
    const key = item.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50);

    // Keep the higher priority or newer item
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, item);
    } else {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[item.priority] < priorityOrder[existing.priority]) {
        seen.set(key, item);
      } else if (
        priorityOrder[item.priority] === priorityOrder[existing.priority] &&
        item.timestamp > existing.timestamp
      ) {
        seen.set(key, item);
      }
    }
  }

  return Array.from(seen.values());
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
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
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

  // Filter by age
  const cutoff = Date.now() - maxAge * 60 * 60 * 1000;
  allItems = allItems.filter(item => item.timestamp.getTime() >= cutoff);

  // Deduplicate
  allItems = deduplicateItems(allItems);

  // Sort by priority then timestamp
  allItems.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  // Limit items
  allItems = allItems.slice(0, maxItems);

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
    stats: {
      total: allItems.length,
      byCategory,
      bySource,
      errors,
    },
    lastUpdated: new Date(),
  };

  // Cache result
  cache.set(cacheKey, { data: result, timestamp: Date.now() });

  return result;
}

/**
 * Get featured item (highest priority, most recent)
 * Excludes hurricanes category from featured since tropical season is limited
 */
export async function getFeaturedItem(): Promise<RSSItem | null> {
  const result = await aggregateFeeds({ maxItems: 20, maxAge: 24 });

  // Filter out hurricanes category from featured consideration
  const nonTropical = result.items.filter(i => i.category !== 'hurricanes');

  // Prefer high priority items (excluding tropical)
  const highPriority = nonTropical.filter(i => i.priority === 'high');
  if (highPriority.length > 0) {
    return highPriority[0];
  }

  return nonTropical[0] || result.items[0] || null;
}

/**
 * Clear the cache
 */
function clearCache(): void {
  cache.clear();
}

/**
 * Get category configuration
 */
export function getCategoryConfig() {
  return CATEGORY_CONFIG;
}

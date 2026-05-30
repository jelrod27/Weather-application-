/**
 * 16-Bit Weather Platform - RSS Aggregator Service
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Server-side RSS feed fetching, parsing, and aggregation
 */

import * as Sentry from '@sentry/nextjs';
import { XMLParser } from 'fast-xml-parser';
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

// In-memory cache.
// Best-effort warm-instance optimization only: the in-memory map does not
// reliably persist across serverless invocations, so the per-feed
// `next.revalidate` and the CDN `Cache-Control` (see cacheControlForCategories)
// are the real cache. Kept short (5 min) to match the Fast tier so severe
// alerts stay fresh on a warm instance.
const cache = new Map<string, { data: AggregatedResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Per-feed item cap to bound memory/parse cost (PRD §8.1).
const MAX_ITEMS_PER_FEED = 30;

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

// Shared XML parser. Keeps attributes (prefixed `@_`) and CDATA, and leaves
// namespaced keys intact (e.g. `content:encoded`, `dc:creator`, `media:content`).
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: false,
  trimValues: true,
});

// Minimal structural types for the parsed feed tree (avoids `any`).
type XmlValue = string | number | boolean | null | undefined | XmlNode | XmlNode[];
interface XmlNode {
  [key: string]: XmlValue;
  '#text'?: string;
}

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
 * Normalize a parsed value (string, number, or `{ '#text': ... }` node) to a
 * trimmed string. fast-xml-parser represents an element with attributes as an
 * object carrying its text under `#text`.
 */
function nodeText(value: XmlValue): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && !Array.isArray(value)) {
    const text = value['#text'];
    if (typeof text === 'string') return text.trim() || undefined;
    if (typeof text === 'number') return String(text);
  }
  return undefined;
}

/** First defined text value among several candidate keys on a node. */
function firstText(node: XmlNode, keys: string[]): string | undefined {
  for (const key of keys) {
    const text = nodeText(node[key]);
    if (text) return text;
  }
  return undefined;
}

/** Coerce a value that may be a single node or an array of nodes into an array. */
function asArray(value: XmlValue): XmlNode[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as XmlNode[];
  if (typeof value === 'object') return [value as XmlNode];
  return [];
}

/** Resolve the best href for an Atom entry/feed `<link>` (prefers rel="alternate"). */
function atomLinkHref(node: XmlNode): string | undefined {
  const links = asArray(node.link);
  if (links.length === 0) return nodeText(node.link);
  const alternate = links.find((l) => {
    const rel = l['@_rel'];
    return rel === 'alternate' || rel === undefined;
  });
  const chosen = alternate ?? links[0];
  if (typeof chosen === 'string') return chosen;
  return nodeText(chosen['@_href']) ?? nodeText(chosen.href);
}

/** Best-effort image extraction: media:*, enclosure, then inline <img> in body. */
function extractImage(node: XmlNode, body: string | undefined): string | undefined {
  const mediaThumb = node['media:thumbnail'] ?? node.thumbnail;
  if (mediaThumb && typeof mediaThumb === 'object' && !Array.isArray(mediaThumb)) {
    const url = nodeText(mediaThumb['@_url']) ?? nodeText(mediaThumb.url);
    if (url) return url;
  }

  const mediaContent = asArray(node['media:content'])[0];
  if (mediaContent) {
    const url = nodeText(mediaContent['@_url']) ?? nodeText(mediaContent.url);
    if (url) return url;
  }

  const enclosure = asArray(node.enclosure)[0];
  if (enclosure) {
    const type = nodeText(enclosure['@_type']) ?? '';
    const url = nodeText(enclosure['@_url']) ?? nodeText(enclosure.url);
    if (url && (type === '' || type.startsWith('image/'))) return url;
  }

  if (body) {
    const imgMatch = body.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) return imgMatch[1];
  }

  return undefined;
}

/** Build an RSSItem from already-extracted, safety-checked fields. */
function buildItem(
  source: FeedSource,
  index: number,
  fields: {
    title: string;
    safeLink: string;
    body?: string;
    pubDate?: string;
    author?: string;
    rawImage?: string;
    priority?: 'high' | 'medium' | 'low';
    location?: string;
    magnitude?: number;
    depth?: number;
  }
): RSSItem {
  const safeImage = fields.rawImage ? safeExternalUrl(fields.rawImage) : null;
  return {
    id: `${source.id}-${simpleHash(fields.safeLink + index.toString())}-${index}`,
    title: cleanHtml(fields.title),
    description: cleanHtml(fields.body || '').slice(0, 300),
    url: fields.safeLink,
    source: source.name,
    sourceId: source.id,
    category: source.category,
    priority: fields.priority ?? source.priority,
    timestamp: fields.pubDate ? new Date(fields.pubDate) : new Date(),
    imageUrl: safeImage || undefined,
    author: fields.author ? cleanHtml(fields.author) : undefined,
    location: fields.location,
    magnitude: fields.magnitude,
    depth: fields.depth,
  };
}

/**
 * Parse an RSS 2.0 / RDF feed with fast-xml-parser.
 */
function parseRSSFeed(xml: string, source: FeedSource): RSSItem[] {
  let parsed: XmlNode;
  try {
    parsed = xmlParser.parse(xml) as XmlNode;
  } catch {
    return [];
  }

  const rss = parsed.rss as XmlNode | undefined;
  const channel = (rss?.channel as XmlNode | undefined) ?? (parsed['rdf:RDF'] as XmlNode | undefined);
  // RSS 2.0 nests <item> under <channel>; RSS 1.0 (RDF) lists them at top level.
  const rawItems = asArray(channel?.item ?? (parsed['rdf:RDF'] as XmlNode | undefined)?.item);

  const items: RSSItem[] = [];
  for (let i = 0; i < Math.min(rawItems.length, MAX_ITEMS_PER_FEED); i++) {
    const item = rawItems[i];
    try {
      const title = firstText(item, ['title']);
      const link = firstText(item, ['link', 'guid']);
      const body = firstText(item, ['description', 'content:encoded', 'content']);

      // Drop items whose link isn't an http(s) URL (stops `javascript:` etc.).
      const safeLink = safeExternalUrl(link);
      if (!title || !safeLink) continue;

      items.push(
        buildItem(source, i, {
          title,
          safeLink,
          body,
          pubDate: firstText(item, ['pubDate', 'pubdate', 'dc:date', 'date']),
          author: firstText(item, ['author', 'dc:creator']),
          rawImage: extractImage(item, body),
        })
      );
    } catch {
      // Skip malformed items
    }
  }

  return items;
}

/**
 * Parse an Atom feed with fast-xml-parser (USGS earthquakes, NWS alerts).
 */
function parseAtomFeed(xml: string, source: FeedSource): RSSItem[] {
  let parsed: XmlNode;
  try {
    parsed = xmlParser.parse(xml) as XmlNode;
  } catch {
    return [];
  }

  const feed = parsed.feed as XmlNode | undefined;
  const entries = asArray(feed?.entry);

  const items: RSSItem[] = [];
  for (let i = 0; i < Math.min(entries.length, MAX_ITEMS_PER_FEED); i++) {
    const entry = entries[i];
    try {
      const title = firstText(entry, ['title']);
      const link = atomLinkHref(entry) ?? firstText(entry, ['id']);
      const summary = firstText(entry, ['summary', 'content']);

      // Author lives in a nested <author><name>…</name></author>.
      const authorNode = entry.author;
      const author = authorNode && typeof authorNode === 'object' && !Array.isArray(authorNode)
        ? firstText(authorNode as XmlNode, ['name'])
        : nodeText(authorNode);

      // Earthquake enrichment from USGS titles ("M 5.2 - 10 km NE of City").
      let magnitude: number | undefined;
      let depth: number | undefined;
      let location: string | undefined;
      if (source.category === 'earthquakes' && title) {
        const magMatch = title.match(/^M\s*([\d.]+)/);
        if (magMatch) magnitude = parseFloat(magMatch[1]);
        const locMatch = title.match(/- (.+)$/);
        if (locMatch) location = locMatch[1];
        const depthMatch = summary?.match(/Depth[:\s]*([\d.]+)\s*km/i);
        if (depthMatch) depth = parseFloat(depthMatch[1]);
      }

      const safeLink = safeExternalUrl(link);
      if (!title || !safeLink) continue;

      items.push(
        buildItem(source, i, {
          title,
          safeLink,
          body: summary,
          pubDate: firstText(entry, ['updated', 'published']),
          author,
          rawImage: extractImage(entry, summary),
          priority: determinePriority(source, magnitude),
          location,
          magnitude,
          depth,
        })
      );
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
 * Clean HTML tags and decode entities
 */
function cleanHtml(html: string): string {
  return decodeHtmlEntities(html);
}

/** Normalize a title to alphanumeric tokens for dedup comparison. */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fuzzy title match via word-overlap (ported from the removed newsAggregator).
 * Two titles count as duplicates when >=70% of their significant words (length
 * > 3) overlap — catches the same story syndicated across sources with slightly
 * different wording, which the old exact-50-char-prefix check missed.
 */
function isSimilarTitle(a: string, b: string): boolean {
  if (a === b) return true;
  const words1 = new Set(a.split(' ').filter((w) => w.length > 3));
  const words2 = new Set(b.split(' ').filter((w) => w.length > 3));
  if (words1.size === 0 || words2.size === 0) return false;

  let overlap = 0;
  words1.forEach((word) => {
    if (words2.has(word)) overlap++;
  });
  return overlap / Math.max(words1.size, words2.size) >= 0.7;
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

/** True if `candidate` should replace `current` (higher priority, then newer). */
function prefers(candidate: RSSItem, current: RSSItem): boolean {
  const pDiff = PRIORITY_ORDER[candidate.priority] - PRIORITY_ORDER[current.priority];
  if (pDiff !== 0) return pDiff < 0;
  return candidate.timestamp > current.timestamp;
}

/**
 * Cross-source deduplication using fuzzy title matching. n is small (<= a few
 * hundred pre-slice), so the O(n^2) scan is fine and avoids losing near-dupes
 * to an exact-key map.
 */
function deduplicateItems(items: RSSItem[]): RSSItem[] {
  const kept: { key: string; item: RSSItem }[] = [];

  for (const item of items) {
    const key = normalizeTitle(item.title);
    const dupIndex = kept.findIndex((k) => isSimilarTitle(k.key, key));
    if (dupIndex === -1) {
      kept.push({ key, item });
    } else if (prefers(item, kept[dupIndex].item)) {
      kept[dupIndex] = { key, item };
    }
  }

  return kept.map((k) => k.item);
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
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
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

/**
 * Internal helpers exposed for unit testing only (PRD §14). Not part of the
 * module's runtime API — do not import from application code.
 */
export const __testing = {
  parseRSSFeed,
  parseAtomFeed,
  deduplicateItems,
  clearCache,
};

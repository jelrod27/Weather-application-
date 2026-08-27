/**
 * RSS/Atom/JSON feed parsers, item builders, and cross-source dedup.
 */

import { XMLParser } from 'fast-xml-parser';
import { safeExternalUrl, upgradeFeedImageUrl } from '@/lib/safe-url';
import { decodeHtmlEntities } from './html-utils';
import type { FeedCategory, FeedSource } from './feedSources';

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

/** Sentinel for items without a parseable publication date — sorts last, excluded from Happening Now. */
export const MISSING_ITEM_TIMESTAMP = new Date(0);

export const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

// Per-feed item cap to bound memory/parse cost (PRD §8.1).
const MAX_ITEMS_PER_FEED = 30;

function parseItemTimestamp(raw: string | undefined): Date {
  if (!raw?.trim()) return MISSING_ITEM_TIMESTAMP;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? MISSING_ITEM_TIMESTAMP : parsed;
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

/** Read a named CAP parameter from an NWS alert Atom entry. */
function capParameterValue(node: XmlNode, name: string): string | undefined {
  const parameter = asArray(node['cap:parameter']).find((parameter) => {
    return nodeText(parameter.valueName) === name;
  });
  return parameter ? nodeText(parameter.value) : undefined;
}

/**
 * The NWS active-alerts Atom feed marks CAP XML documents as rel="alternate".
 * Those are machine-readable alert payloads and can download in browsers. When
 * possible, route readers to the public forecast.weather.gov text product page.
 */
function nwsAlertReadableUrl(entry: XmlNode, fallbackUrl: string | undefined): string | undefined {
  if (!fallbackUrl?.endsWith('.cap')) return fallbackUrl;

  const awipsIdentifier = capParameterValue(entry, 'AWIPSidentifier');
  const match = awipsIdentifier?.trim().match(/^([A-Z0-9]{3})([A-Z0-9]{3,4})$/i);
  if (!match) return 'https://www.weather.gov/alerts';

  const [, product, issuedBy] = match;
  const params = new URLSearchParams({
    site: 'NWS',
    issuedby: issuedBy.toUpperCase(),
    product: product.toUpperCase(),
    format: 'CI',
    version: '1',
    glossary: '0',
  });
  return `https://forecast.weather.gov/product.php?${params.toString()}`;
}

// Hosts that serve players/embeds, not images. A feed's media:content can
// point at a YouTube embed (medium="video"); shoved into <img> the browser
// blocks it (ERR_BLOCKED_BY_ORB) and the card flashes a broken image.
const NON_IMAGE_HOSTS = ['youtube.com/embed', 'youtu.be', 'player.vimeo.com'];
// Extensions that are definitely not still images.
const NON_IMAGE_EXT = /\.(mp4|webm|mov|m4v|avi|mkv|mp3|m4a|wav|pdf|html?)(?:[?#]|$)/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(?:[?#]|$)/i;

/**
 * True only for URLs plausibly renderable in an <img>. Rejects known
 * player/embed hosts and non-image extensions; accepts a known image
 * extension or an extensionless URL (many image CDNs serve those). The point
 * is to keep video embeds and media files out of the image slot.
 */
function isLikelyImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (NON_IMAGE_HOSTS.some((h) => lower.includes(h))) return false;
  if (NON_IMAGE_EXT.test(lower)) return false;
  if (IMAGE_EXT.test(lower)) return true;
  // No recognizable file extension at all -> allow (CDN-style image URL).
  return !/\.[a-z0-9]{2,5}(?:[?#]|$)/i.test(lower);
}

/** media:* declares its kind via `medium` ("image"|"video"|...) or a MIME `type`. */
function isImageMediaNode(media: XmlNode): boolean {
  const medium = nodeText(media['@_medium']);
  if (medium) return medium === 'image';
  const type = nodeText(media['@_type']);
  if (type) return type.startsWith('image/');
  return true; // no hints -> fall back to URL-shape check by the caller
}

/** Collect all HTML-bearing fields from an RSS/Atom item for image extraction. */
function itemHtmlForImages(node: XmlNode): string {
  const keys = ['content:encoded', 'content', 'description', 'summary'];
  const parts: string[] = [];
  for (const key of keys) {
    const text = firstText(node, [key]);
    if (text) parts.push(text);
  }
  return parts.join('\n');
}

/** Best-effort image extraction: media:* on the node, then inline <img> in all HTML fields. */
function extractImageFromItem(node: XmlNode): string | undefined {
  const fromMedia = extractImage(node, undefined);
  if (fromMedia) return fromMedia;
  return extractImage(node, itemHtmlForImages(node));
}

/** Best-effort image extraction: media:*, enclosure, then inline <img> in body. */
function extractImage(node: XmlNode, body: string | undefined): string | undefined {
  const mediaThumb = node['media:thumbnail'] ?? node.thumbnail;
  if (mediaThumb && typeof mediaThumb === 'object' && !Array.isArray(mediaThumb)) {
    const url = nodeText(mediaThumb['@_url']) ?? nodeText(mediaThumb.url);
    if (url && isLikelyImageUrl(url)) return url;
  }

  // Pick the first media:content that is actually an image, not the first one
  // outright — video entries (e.g. YouTube) often precede a real thumbnail.
  for (const media of asArray(node['media:content'])) {
    if (!isImageMediaNode(media)) continue;
    const url = nodeText(media['@_url']) ?? nodeText(media.url);
    if (url && isLikelyImageUrl(url)) return url;
  }

  const enclosure = asArray(node.enclosure)[0];
  if (enclosure) {
    const type = nodeText(enclosure['@_type']) ?? '';
    const url = nodeText(enclosure['@_url']) ?? nodeText(enclosure.url);
    if (url && (type === '' || type.startsWith('image/')) && isLikelyImageUrl(url)) return url;
  }

  if (body) {
    const imgRx = /<img[^>]+src=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = imgRx.exec(body)) !== null) {
      const raw = decodeHtmlEntities(match[1].trim());
      if (raw && isLikelyImageUrl(raw)) return raw;
    }
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
  // Upgrade http -> https before the scheme guard: CSP img-src only allows
  // https, so an http feed image would otherwise be dropped or blocked.
  const safeImage = fields.rawImage ? safeExternalUrl(upgradeFeedImageUrl(fields.rawImage)) : null;
  const timestamp = parseItemTimestamp(fields.pubDate);
  return {
    id: `${source.id}-${simpleHash(fields.safeLink + index.toString())}-${index}`,
    title: cleanHtml(fields.title),
    description: cleanHtml(fields.body || '').slice(0, 300),
    url: fields.safeLink,
    source: source.name,
    sourceId: source.id,
    category: source.category,
    priority: fields.priority ?? source.priority,
    timestamp,
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
export function parseRSSFeed(xml: string, source: FeedSource): RSSItem[] {
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
          rawImage: extractImageFromItem(item),
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
export function parseAtomFeed(xml: string, source: FeedSource): RSSItem[] {
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
      const rawLink = atomLinkHref(entry) ?? firstText(entry, ['id']);
      const link = source.id === 'nws-alerts' ? nwsAlertReadableUrl(entry, rawLink) : rawLink;
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
          rawImage: extractImageFromItem(entry),
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

/** A single notice from the USGS getElevatedVolcanoes JSON API. */
interface UsgsVolcanoNotice {
  volcano_name?: string;
  color_code?: string;
  alert_level?: string;
  sent_utc?: string;
  notice_url?: string;
  obs_fullname?: string;
}

/**
 * Parse the USGS getElevatedVolcanoes JSON feed. The endpoint returns only
 * currently-elevated volcanoes (those above the normal/green alert level), each
 * with an aviation color code and a WATCH/WARNING/ADVISORY level.
 */
function parseUsgsVolcanoesJson(data: unknown, source: FeedSource): RSSItem[] {
  if (!Array.isArray(data)) return [];

  const items: RSSItem[] = [];
  for (let i = 0; i < Math.min(data.length, MAX_ITEMS_PER_FEED); i++) {
    // Skip malformed array elements individually (like the RSS/Atom parsers do)
    // so one bad entry can't throw and drop the entire volcano feed.
    const raw = data[i];
    if (!raw || typeof raw !== 'object') continue;
    const notice = raw as UsgsVolcanoNotice;
    const name = notice.volcano_name?.trim();
    const safeLink = safeExternalUrl(notice.notice_url);
    if (!name || !safeLink) continue;

    const level = (notice.alert_level || 'ADVISORY').trim();
    const color = (notice.color_code || '').trim();
    const observatory = notice.obs_fullname?.trim() || 'USGS';
    const sentRaw = notice.sent_utc ? notice.sent_utc.replace(' ', 'T') + 'Z' : undefined;
    const sent = parseItemTimestamp(sentRaw);

    items.push({
      id: `${source.id}-${simpleHash(safeLink + i.toString())}-${i}`,
      title: cleanHtml(color ? `${name} Volcano — ${level} (${color})` : `${name} Volcano — ${level}`),
      description: cleanHtml(
        `${observatory} has an active ${level} alert${color ? ` (aviation color ${color})` : ''} for ${name}.`
      ).slice(0, 300),
      url: safeLink,
      source: source.name,
      sourceId: source.id,
      category: source.category,
      priority: source.priority,
      timestamp: sent,
      location: name,
    });
  }

  return items;
}

/**
 * Parse a JSON-format feed. Dispatched by source id (currently only the USGS
 * elevated-volcanoes API); add new shapes here as JSON sources are introduced.
 */
export function parseJsonFeed(text: string, source: FeedSource): RSSItem[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }

  if (source.id === 'usgs-volcanoes') {
    return parseUsgsVolcanoesJson(data, source);
  }
  return [];
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
export function deduplicateItems(items: RSSItem[]): RSSItem[] {
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
 * Internal helpers exposed for unit testing only (PRD §14). Not part of the
 * module's runtime API — do not import from application code.
 *
 * `clearCache` is attached by the rssAggregator barrel (lives in aggregate-cache).
 */
export const __testing = {
  parseRSSFeed,
  parseAtomFeed,
  parseJsonFeed,
  deduplicateItems,
  extractImage,
  isLikelyImageUrl,
  parseItemTimestamp,
  MISSING_ITEM_TIMESTAMP,
};

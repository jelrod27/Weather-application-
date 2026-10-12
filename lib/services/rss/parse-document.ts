import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { safeExternalUrl } from '@/lib/safe-url';
import { MAX_ITEMS_PER_FEED, parseAtomFeed, parseJsonFeed, parseRSSFeed } from './parse-feed';
import type { RSSItem } from './parse-feed';
import type { FeedSource } from './feedSources';

export interface ParsedFeed {
  items: RSSItem[];
  received: number;
  rejected: number;
  truncated: boolean;
  pages: number;
  issues: string[];
  generatedAt?: string;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Malformed feed document');
  return value as Record<string, unknown>;
}

function parseEarthquakes(data: Record<string, unknown>, source: FeedSource, now: number): ParsedFeed {
  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Malformed earthquake collection');
  const metadata = record(data.metadata);
  if (typeof metadata.generated !== 'number' || !Number.isFinite(metadata.generated) || metadata.generated > now + 60_000 ||
      typeof metadata.count !== 'number' || metadata.count !== data.features.length) throw new Error('Invalid earthquake collection metadata');
  const items: RSSItem[] = [];
  let rejected = 0;
  for (const raw of data.features.slice(0, 500)) {
    try {
      const feature = record(raw);
      const p = record(feature.properties);
      const geometry = record(feature.geometry);
      const coords = geometry.coordinates;
      const url = typeof p.url === 'string' ? safeExternalUrl(p.url) : null;
      if (typeof feature.id !== 'string' || !feature.id || !url || new URL(url).hostname !== 'earthquake.usgs.gov' ||
          typeof p.mag !== 'number' || !Number.isFinite(p.mag) || p.mag < -2 || p.mag > 10 ||
          typeof p.time !== 'number' || !Number.isFinite(p.time) || p.time <= 0 || p.time > now + 60_000 ||
          typeof p.updated !== 'number' || !Number.isFinite(p.updated) || p.updated < p.time || p.updated > now + 60_000 ||
          typeof p.place !== 'string' || !p.place || geometry.type !== 'Point' || !Array.isArray(coords) || coords.length < 3 ||
          !coords.every(value => typeof value === 'number' && Number.isFinite(value)) || Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90) {
        rejected++; continue;
      }
      const occurredAt = new Date(p.time).toISOString();
      items.push({
        id: `usgs:${feature.id}`, title: `M ${p.mag.toFixed(1)} - ${p.place}`,
        description: `Earthquake at ${occurredAt}; depth ${coords[2]} km.`,
        url, source: source.name, sourceId: source.id, category: source.category,
        priority: p.mag >= 6 ? 'high' : p.mag >= 5 ? 'medium' : 'low',
        timestamp: new Date(p.time), occurredAt, updatedAt: new Date(p.updated).toISOString(),
        magnitude: p.mag, depth: coords[2], location: p.place, kind: 'event', lifecycle: 'inactive',
        identity: { authority: 'usgs', eventId: feature.id, productId: feature.id },
      });
    } catch { rejected++; }
  }
  return {
    items, received: data.features.length, rejected, truncated: data.features.length > 500, pages: 1,
    issues: rejected ? ['Some earthquake records could not be validated'] : [],
    generatedAt: new Date(metadata.generated).toISOString(),
  };
}

/** Valid empty documents are distinct from malformed documents and rejected rows. */
export function parseFeedDocument(text: string, source: FeedSource, now = Date.now()): ParsedFeed {
  let rawCount = 0;
  let items: RSSItem[];
  if (source.format === 'json') {
    const data: unknown = JSON.parse(text);
    if (source.category === 'earthquakes') return parseEarthquakes(record(data), source, now);
    if (source.id !== 'usgs-volcanoes' || !Array.isArray(data)) throw new Error('Unsupported JSON feed shape');
    rawCount = data.length;
    items = parseJsonFeed(text, source);
  } else {
    if (XMLValidator.validate(text) !== true) throw new Error('Malformed XML feed');
    const parsed = record(new XMLParser({ ignoreAttributes: false }).parse(text));
    let raw: unknown;
    if (source.format === 'atom') {
      const feed = parsed.feed === '' ? {} : record(parsed.feed);
      raw = feed.entry;
      items = parseAtomFeed(text, source);
    } else {
      const root = parsed['rdf:RDF'] ?? record(parsed.rss).channel;
      const channel = root === '' ? {} : record(root);
      raw = channel.item;
      items = parseRSSFeed(text, source);
    }
    rawCount = raw == null ? 0 : Array.isArray(raw) ? raw.length : 1;
  }
  items = items.filter(item => item.timestamp.getTime() > 0 && item.timestamp.getTime() <= now + 60_000);
  const rejected = Math.min(rawCount, MAX_ITEMS_PER_FEED) - items.length;
  return {
    items, received: rawCount, rejected, truncated: rawCount > MAX_ITEMS_PER_FEED, pages: 1,
    issues: rejected ? ['Some feed records had invalid fields or timestamps'] : [],
  };
}

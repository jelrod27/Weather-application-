/**
 * Unit tests for the RSS aggregator (news overhaul, PRD §14):
 *  - fast-xml-parser RSS/Atom parsing + field extraction
 *  - USGS earthquake enrichment (magnitude / depth / location)
 *  - safeExternalUrl scheme guard + decodeHtmlEntities applied
 *  - cross-source fuzzy (token-overlap) dedup
 *  - per-category tiered Cache-Control
 */

import {
  __testing,
  cacheControlForCategories,
  type RSSItem,
} from '@/lib/services/rss/rssAggregator';
import type { FeedSource } from '@/lib/services/rss/feedSources';

const { parseRSSFeed, parseAtomFeed, parseJsonFeed, deduplicateItems } = __testing;

function source(overrides: Partial<FeedSource> = {}): FeedSource {
  return {
    id: 'test-feed',
    name: 'Test Feed',
    url: 'https://example.com/feed.xml',
    category: 'science',
    priority: 'medium',
    enabled: true,
    format: 'rss',
    refreshInterval: 60,
    ...overrides,
  };
}

function item(overrides: Partial<RSSItem> = {}): RSSItem {
  return {
    id: 'id',
    title: 'Title',
    description: '',
    url: 'https://example.com/a',
    source: 'Test',
    sourceId: 'test',
    category: 'science',
    priority: 'medium',
    timestamp: new Date('2026-05-29T12:00:00Z'),
    ...overrides,
  };
}

describe('parseRSSFeed', () => {
  it('extracts core fields, decodes entities, and reads an enclosure image', () => {
    const xml = `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <title>Sample</title>
          <item>
            <title>Storms &amp; Floods hit the coast</title>
            <link>https://news.example.com/story-1</link>
            <description><![CDATA[<p>Heavy rain &amp; wind</p>]]></description>
            <pubDate>Wed, 27 May 2026 10:00:00 GMT</pubDate>
            <author>Jane Reporter</author>
            <enclosure url="https://img.example.com/pic.jpg" type="image/jpeg" />
          </item>
        </channel>
      </rss>`;

    const items = parseRSSFeed(xml, source());
    expect(items).toHaveLength(1);
    const [it] = items;
    expect(it.title).toBe('Storms & Floods hit the coast'); // &amp; decoded
    expect(it.description).toBe('Heavy rain & wind'); // tags stripped, entity decoded
    expect(it.url).toBe('https://news.example.com/story-1');
    expect(it.author).toBe('Jane Reporter');
    expect(it.imageUrl).toBe('https://img.example.com/pic.jpg');
    expect(it.timestamp.getUTCFullYear()).toBe(2026);
  });

  it('drops items whose link uses a non-http(s) scheme (javascript:)', () => {
    const xml = `<rss version="2.0"><channel>
      <item><title>Bad</title><link>javascript:alert(1)</link></item>
      <item><title>Good</title><link>https://ok.example.com/x</link></item>
    </channel></rss>`;

    const items = parseRSSFeed(xml, source());
    expect(items.map((i) => i.title)).toEqual(['Good']);
  });

  it('drops an unsafe image URL while keeping the item', () => {
    const xml = `<rss version="2.0"><channel><item>
      <title>Keep me</title>
      <link>https://ok.example.com/x</link>
      <enclosure url="javascript:alert(1)" type="image/png" />
    </item></channel></rss>`;

    const [it] = parseRSSFeed(xml, source());
    expect(it.title).toBe('Keep me');
    expect(it.imageUrl).toBeUndefined();
  });

  // Regression: an unparseable pubDate produced an Invalid Date (NaN epoch),
  // which failed the freshness-cutoff comparison downstream and silently
  // dropped the item after parsing succeeded.
  it('falls back to now for unparseable pubDate instead of Invalid Date', () => {
    const xml = `<rss version="2.0"><channel><item>
      <title>Odd date</title>
      <link>https://ok.example.com/odd</link>
      <pubDate>2026年5月27日</pubDate>
    </item></channel></rss>`;

    const [it] = parseRSSFeed(xml, source());
    expect(it.title).toBe('Odd date');
    expect(Number.isNaN(it.timestamp.getTime())).toBe(false);
  });

  it('caps output at MAX_ITEMS_PER_FEED (30)', () => {
    const entries = Array.from({ length: 40 }, (_, i) =>
      `<item><title>Item ${i}</title><link>https://e.example.com/${i}</link></item>`
    ).join('');
    const items = parseRSSFeed(`<rss version="2.0"><channel>${entries}</channel></rss>`, source());
    expect(items).toHaveLength(30);
  });
});

describe('parseAtomFeed', () => {
  it('extracts USGS earthquake magnitude, depth, and location', () => {
    const xml = `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>M 6.4 - 12 km NE of Testville, Country</title>
          <link rel="alternate" href="https://earthquake.usgs.gov/eq/1" />
          <summary>Depth: 35.0 km. Details follow.</summary>
          <updated>2026-05-28T08:30:00Z</updated>
          <author><name>USGS</name></author>
        </entry>
      </feed>`;

    const [it] = parseAtomFeed(xml, source({ category: 'earthquakes', priority: 'low' }));
    expect(it.magnitude).toBe(6.4);
    expect(it.depth).toBe(35);
    expect(it.location).toBe('12 km NE of Testville, Country');
    expect(it.url).toBe('https://earthquake.usgs.gov/eq/1');
    expect(it.author).toBe('USGS');
    // Priority escalates with magnitude (>=6 => high) regardless of source priority.
    expect(it.priority).toBe('high');
  });

  it('prefers the rel="alternate" link over other links', () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
      <title>Alert</title>
      <link rel="self" href="https://api.example.com/self" />
      <link rel="alternate" href="https://www.example.com/human" />
      <updated>2026-05-28T08:30:00Z</updated>
    </entry></feed>`;

    const [it] = parseAtomFeed(xml, source({ category: 'severe', format: 'atom' }));
    expect(it.url).toBe('https://www.example.com/human');
  });

  it('maps NWS CAP alert links to readable forecast product pages', () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2"><entry>
      <title>Flash Flood Warning issued by NWS Austin/San Antonio TX</title>
      <link rel="alternate" href="https://api.weather.gov/alerts/urn:oid:test-alert.cap" />
      <summary>Flash flooding is ongoing.</summary>
      <updated>2026-06-15T13:42:00Z</updated>
      <cap:parameter>
        <valueName>AWIPSidentifier</valueName>
        <value>FFWEWX</value>
      </cap:parameter>
    </entry></feed>`;

    const [it] = parseAtomFeed(xml, source({ id: 'nws-alerts', category: 'severe', format: 'atom' }));
    expect(it.url).toBe(
      'https://forecast.weather.gov/product.php?site=NWS&issuedby=EWX&product=FFW&format=CI&version=1&glossary=0'
    );
  });
});

describe('parseJsonFeed (USGS elevated volcanoes)', () => {
  const volcanoSource = () => source({ id: 'usgs-volcanoes', name: 'USGS Volcano Alerts', category: 'volcanoes', priority: 'high', format: 'json' });

  it('maps an elevated-volcano notice to an RSSItem with color + alert level', () => {
    const json = JSON.stringify([
      {
        volcano_name: 'Great Sitkin',
        color_code: 'ORANGE',
        alert_level: 'WATCH',
        sent_utc: '2026-05-29 20:19:13',
        notice_url: 'https://volcanoes.usgs.gov/hans-public/notice/abc',
        obs_fullname: 'Alaska Volcano Observatory',
      },
    ]);
    const [it] = parseJsonFeed(json, volcanoSource());
    expect(it.title).toBe('Great Sitkin Volcano — WATCH (ORANGE)');
    expect(it.category).toBe('volcanoes');
    expect(it.priority).toBe('high');
    expect(it.location).toBe('Great Sitkin');
    expect(it.url).toBe('https://volcanoes.usgs.gov/hans-public/notice/abc');
    expect(it.description).toContain('Alaska Volcano Observatory');
    expect(it.timestamp.getUTCFullYear()).toBe(2026);
  });

  it('drops notices with an unsafe or missing notice_url', () => {
    const json = JSON.stringify([
      { volcano_name: 'Bad', alert_level: 'WATCH', notice_url: 'javascript:alert(1)' },
      { volcano_name: 'NoUrl', alert_level: 'WATCH' },
    ]);
    expect(parseJsonFeed(json, volcanoSource())).toHaveLength(0);
  });

  it('returns [] on malformed JSON or a non-array payload', () => {
    expect(parseJsonFeed('not json', volcanoSource())).toEqual([]);
    expect(parseJsonFeed('{"not":"an array"}', volcanoSource())).toEqual([]);
  });

  it('skips null / non-object array elements without dropping valid ones', () => {
    const json = JSON.stringify([
      null,
      'not-an-object',
      { volcano_name: 'Kilauea', alert_level: 'WARNING', color_code: 'RED', notice_url: 'https://volcanoes.usgs.gov/n/1' },
    ]);
    const items = parseJsonFeed(json, volcanoSource());
    expect(items).toHaveLength(1);
    expect(items[0].location).toBe('Kilauea');
  });
});

describe('deduplicateItems', () => {
  it('collapses near-identical titles from different sources to the higher-priority one', () => {
    const items = [
      item({ id: 'a', title: 'Major earthquake strikes northern coast region', priority: 'low', source: 'A' }),
      item({ id: 'b', title: 'Major earthquake strikes the northern coast region today', priority: 'high', source: 'B' }),
    ];
    const deduped = deduplicateItems(items);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].priority).toBe('high');
    expect(deduped[0].source).toBe('B');
  });

  it('on equal priority keeps the newer item', () => {
    const items = [
      item({ id: 'old', title: 'Volcano alert raised for island summit', timestamp: new Date('2026-05-01T00:00:00Z') }),
      item({ id: 'new', title: 'Volcano alert raised for the island summit', timestamp: new Date('2026-05-20T00:00:00Z') }),
    ];
    const deduped = deduplicateItems(items);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe('new');
  });

  it('keeps genuinely different stories', () => {
    const items = [
      item({ id: 'a', title: 'Hurricane forms in the Atlantic basin' }),
      item({ id: 'b', title: 'Wildfire spreads across western forests' }),
    ];
    expect(deduplicateItems(items)).toHaveLength(2);
  });
});

describe('cacheControlForCategories (tiered cache, §9)', () => {
  it('uses the Fast tier for severe', () => {
    expect(cacheControlForCategories(['severe'])).toContain('s-maxage=300');
  });

  it('uses the Slow tier for science', () => {
    expect(cacheControlForCategories(['science'])).toContain('s-maxage=21600');
  });

  it('uses the Medium tier for earthquakes', () => {
    expect(cacheControlForCategories(['earthquakes'])).toContain('s-maxage=1800');
  });

  it('defaults the "all" request (no categories) to the Fast tier', () => {
    expect(cacheControlForCategories()).toContain('s-maxage=300');
  });

  it('picks the fastest tier present in a mixed request', () => {
    expect(cacheControlForCategories(['science', 'severe'])).toContain('s-maxage=300');
    expect(cacheControlForCategories(['science', 'earthquakes'])).toContain('s-maxage=1800');
  });
});

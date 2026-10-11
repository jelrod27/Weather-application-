/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { FEED_SOURCES } from '@/lib/services/rss/feedSources';
import { parseFeedDocument } from '@/lib/services/rss/parse-document';
import { clearFeedSnapshots, fetchFeed } from '@/lib/services/rss/fetch-feed';
import { deduplicateItems } from '@/lib/services/rss/parse-feed';
import { selectHappeningNow } from '@/lib/news/rails';
import { aggregateFeeds } from '@/lib/services/rss/aggregate-cache';
import type { FeedSource } from '@/lib/services/rss/feedSources';

jest.mock('@sentry/nextjs', () => ({ addBreadcrumb: jest.fn(), captureMessage: jest.fn() }));
jest.mock('@/lib/services/rss/enrich-images', () => ({ enrichItemImages: async (items: unknown[]) => items }));
const NOW = Date.parse('2026-10-11T22:50:00Z');
const fixture = (file: string): string => readFileSync('__tests__/fixtures/news/' + file, 'utf8');
const quake = FEED_SOURCES.find(source => source.id === 'usgs-significant')!;
const nhc = FEED_SOURCES.find(source => source.id === 'nhc-atlantic')!;
const editorial: FeedSource = { id: 'test', name: 'Test', url: 'https://example.com/feed', category: 'science', priority: 'low', enabled: true, format: 'rss', refreshInterval: 5 };
function rss(count = 1): string {
  return '<rss><channel><title>Example</title>' + Array.from({ length: count }, (_, n) => '<item><title>Article ' + n + '</title><link>https://example.com/' + n + '</link><pubDate>Sun, 11 Oct 2026 22:00:00 GMT</pubDate></item>').join('') + '</channel></rss>';
}
describe('news source integrity', () => {
  beforeEach(() => { clearFeedSnapshots(); jest.useFakeTimers({ now: NOW }); });
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

  it('keeps USGS occurrence time separate from a two-day-later update', () => {
    const data = JSON.parse(fixture('usgs-2026-10-11.json'));
    data.features = [data.features[0]]; data.metadata.count = 1;
    data.features[0].properties.time = NOW - 48 * 3600_000;
    data.features[0].properties.updated = NOW;
    const result = parseFeedDocument(JSON.stringify(data), quake, NOW);
    expect(result.items[0]).toMatchObject({ occurredAt: '2026-10-09T22:50:00.000Z', updatedAt: '2026-10-11T22:50:00.000Z', kind: 'event', lifecycle: 'inactive' });
    expect(result.items[0].timestamp.getTime()).toBe(NOW - 48 * 3600_000);
    expect(selectHappeningNow(result.items, NOW)).toEqual([]);
  });

  it('rejects malformed earthquake records and distinguishes valid empty collections', () => {
    const data = JSON.parse(fixture('usgs-2026-10-11.json'));
    expect(parseFeedDocument(JSON.stringify(data), quake, NOW).items).toHaveLength(data.metadata.count);
    data.features[0].properties.mag = null;
    expect(parseFeedDocument(JSON.stringify(data), quake, NOW).rejected).toBe(1);
    data.features = []; data.metadata.count = 0;
    expect(parseFeedDocument(JSON.stringify(data), quake, NOW)).toMatchObject({ items: [], rejected: 0, received: 0 });
    data.metadata.count = 1;
    expect(() => parseFeedDocument(JSON.stringify(data), quake, NOW)).toThrow('metadata');
  });

  it('groups USGS duplicates by event ID and prefers a healthy source over delayed data', () => {
    const first = parseFeedDocument(fixture('usgs-2026-10-11.json'), quake, NOW).items[0];
    const grouped = deduplicateItems([{ ...first, sourceState: 'delayed', updatedAt: new Date(NOW).toISOString() }, { ...first, sourceId: 'usgs-m45', sourceState: 'fresh' }]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].sourceId).toBe('usgs-m45');
  });

  it('replays NHC final bulletins, groups explicit ATCF identities, and retains original products', () => {
    const result = parseFeedDocument(fixture('nhc-atlantic-2026-10-11.xml'), nhc, NOW);
    expect(result.rejected).toBe(0);
    expect(result.items.filter(item => item.tropicalStatus === 'final').length).toBeGreaterThan(0);
    const grouped = deduplicateItems(result.items);
    const event = grouped.find(item => item.identity?.eventId === 'AL092026');
    expect(event?.updates?.length).toBeGreaterThan(1);
    expect(event?.updates?.some(update => update.tropicalStatus === 'final')).toBe(true);
    expect(grouped.length).toBeLessThan(result.items.length);
    expect(result.items.every(item => item.lifecycle === 'unverified')).toBe(true);
    expect(selectHappeningNow(grouped, NOW)).toEqual([]);
    expect(result.items.some(item => !item.identity)).toBe(true);
  });

  it('does not treat matching hazard or outlook titles as identity', () => {
    const base = parseFeedDocument(rss(), editorial, NOW).items[0];
    for (const kind of ['hazard', 'outlook', 'event'] as const) {
      expect(deduplicateItems([{ ...base, kind, id: 'one' }, { ...base, kind, id: 'two' }])).toHaveLength(2);
    }
  });

  it('marks XML caps and missing dates as partial and rejects HTML masquerading as a feed', () => {
    expect(parseFeedDocument(rss(31), editorial, NOW)).toMatchObject({ received: 31, truncated: true });
    expect(parseFeedDocument(rss().replace(/<pubDate>.*?<\/pubDate>/, ''), editorial, NOW)).toMatchObject({ rejected: 1, items: [] });
    expect(parseFeedDocument('<rss><channel/></rss>', editorial, NOW).received).toBe(0);
    expect(() => parseFeedDocument('<html><body>Temporarily unavailable</body></html>', editorial, NOW)).toThrow();
  });

  it('coalesces concurrent checks and rejects provider-cached stale data', async () => {
    const fetcher = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(rss()));
    const results = await Promise.all([fetchFeed(editorial), fetchFeed(editorial)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results[0].health.lastSuccessAt).toBe(results[1].health.lastSuccessAt);
    clearFeedSnapshots(); fetcher.mockResolvedValue(new Response(rss(), { headers: { age: '3600' } }));
    expect((await fetchFeed(editorial)).health.state).toBe('unavailable');
    clearFeedSnapshots(); fetcher.mockResolvedValue(new Response(fixture('usgs-2026-10-11.json')));
    jest.setSystemTime(NOW + 3600_000);
    expect((await fetchFeed(quake)).health.state).toBe('unavailable');
  });

  it('keeps independent source failures visible and does not stamp cached checks on reassembly', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(async input => String(input).includes('api.weather.gov')
      ? new Response('down', { status: 503 }) : new Response(rss()));
    const result = await aggregateFeeds({ categories: ['severe'], maxItems: 5 });
    expect(result.sources.find(source => source.id === 'nws-alerts')?.state).toBe('unavailable');
    expect(result.sources.some(source => source.state === 'fresh')).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.happeningNow).toEqual([]);
    const checked = result.sources.find(source => source.state === 'fresh')!;
    jest.setSystemTime(NOW + 10_000);
    const assembled = await aggregateFeeds({ categories: ['severe'], maxItems: 1 });
    expect(assembled.sources.find(source => source.id === checked.id)?.lastSuccessAt).toBe(checked.lastSuccessAt);
    expect(assembled.lastUpdated.getTime()).toBe(NOW + 10_000);
  });
});

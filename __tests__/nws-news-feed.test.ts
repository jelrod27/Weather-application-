/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { FEED_SOURCES } from '@/lib/services/rss/feedSources';
import { clearFeedSnapshots, fetchFeed } from '@/lib/services/rss/fetch-feed';
import { deduplicateItems } from '@/lib/services/rss/parse-feed';
import { selectHappeningNow } from '@/lib/news/rails';
import { projectNewsSnapshot } from '@/lib/news/snapshot';

jest.mock('@sentry/nextjs', () => ({ addBreadcrumb: jest.fn(), captureMessage: jest.fn() }));
const source = FEED_SOURCES.find(feed => feed.id === 'nws-alerts')!;
const NOW = Date.parse('2026-10-11T22:50:00Z');
const iso = (offset: number): string => new Date(NOW + offset).toISOString();
function alert(id: string, overrides: Record<string, unknown> = {}) {
  return { type: 'Feature', geometry: null, properties: {
    id, event: 'Tornado Warning', headline: 'Tornado Warning issued', description: 'Take shelter',
    status: 'Actual', messageType: 'Alert', severity: 'Extreme', urgency: 'Immediate', certainty: 'Observed',
    sent: iso(-60_000), effective: iso(-60_000), expires: iso(30 * 60_000), ends: null,
    areaDesc: 'Example County', geocode: { UGC: ['TXC001'] }, affectedZones: [],
    parameters: { VTEC: ['/O.NEW.KFWD.TO.W.0001.261011T2249Z-261011T2320Z/'] }, ...overrides,
  } };
}
function page(features: unknown[], next?: string): Response {
  return Response.json({ type: 'FeatureCollection', features, ...(next ? { pagination: { next } } : {}) });
}
beforeEach(() => { clearFeedSnapshots(); jest.useFakeTimers({ now: NOW }); });
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

it('uses supported national GeoJSON parameters and preserves structured warning facts', async () => {
  const fetcher = jest.spyOn(globalThis, 'fetch').mockResolvedValue(page([alert('one')]));
  const result = await fetchFeed(source);
  expect(result.health).toMatchObject({ state: 'fresh', received: 1, accepted: 1, rejected: 0, pages: 1 });
  expect(result.items[0]).toMatchObject({ kind: 'hazard', lifecycle: 'active', identity: { authority: 'nws', areaKey: 'TXC001' }, warning: { severity: 'Extreme', urgency: 'Immediate', areas: ['TXC001'] } });
  expect(selectHappeningNow(result.items, NOW)).toHaveLength(1);
  expect(String(fetcher.mock.calls[0][0])).toBe('https://api.weather.gov/alerts/active?status=actual');
  expect(fetcher.mock.calls[0][1]).toMatchObject({ cache: 'no-store', headers: { Accept: expect.stringContaining('geo+json') } });
});

it('distinguishes verified empty coverage from HTTP failure and malformed success', async () => {
  const fetcher = jest.spyOn(globalThis, 'fetch').mockResolvedValue(page([]));
  expect((await fetchFeed(source)).health.state).toBe('fresh');
  clearFeedSnapshots(); fetcher.mockResolvedValue(new Response('down', { status: 503 }));
  expect(await fetchFeed(source)).toMatchObject({ items: [], health: { state: 'unavailable', lastSuccessAt: null } });
  clearFeedSnapshots(); fetcher.mockResolvedValue(Response.json({ features: [] }));
  expect((await fetchFeed(source)).health.state).toBe('unavailable');
});

it('resolves cancellations across pages without collapsing another county', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(page([alert('one'), alert('other', { geocode: { UGC: ['TXC003'] }, areaDesc: 'Other County' })], 'https://api.weather.gov/alerts?cursor=two'))
    .mockResolvedValueOnce(page([alert('cancel', { sent: iso(-30_000), messageType: 'Cancel', parameters: { VTEC: ['/O.CAN.KFWD.TO.W.0001.261011T2249Z-261011T2320Z/'] } })]));
  const result = await fetchFeed(source);
  const grouped = deduplicateItems(result.items);
  expect(result.health.pages).toBe(2);
  expect(grouped).toHaveLength(2);
  expect(selectHappeningNow(grouped, NOW).map(item => item.identity?.areaKey)).toEqual(['TXC003']);
  expect(grouped.find(item => item.identity?.areaKey === 'TXC001')?.updates).toHaveLength(2);
});

it.each([
  ['expired', { expires: iso(-1) }],
  ['future', { effective: iso(60_000) }],
  ['cancelled', { messageType: 'Cancel' }],
  ['advisory', { event: 'Wind Advisory' }],
])('keeps %s reports outside Happening Now', async (_name, overrides) => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(page([alert('one', overrides)]));
  expect(selectHappeningNow((await fetchFeed(source)).items, NOW)).toEqual([]);
});

it.each(['failure', 'untrusted', 'cycle', 'malformed'])('marks incomplete %s pagination as partial, never active', async mode => {
  const next = mode === 'untrusted' ? 'https://example.com/alerts' : mode === 'cycle' ? source.url : 'https://api.weather.gov/alerts?cursor=next';
  const fetcher = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(page([alert('one')], next));
  fetcher.mockResolvedValue(mode === 'malformed' ? Response.json({ nope: [] }) : new Response('down', { status: 503 }));
  const result = await fetchFeed(source);
  expect(result.health).toMatchObject({ state: 'partial', truncated: true, accepted: 1 });
  expect(selectHappeningNow(result.items, NOW)).toEqual([]);
  expect(projectNewsSnapshot(result.items, [result.health], NOW).delayedItems).toHaveLength(1);
  if (mode === 'untrusted' || mode === 'cycle') expect(fetcher).toHaveBeenCalledTimes(1);
});

it('caps pagination and reports rejected rows without declaring complete coverage', async () => {
  let n = 0;
  jest.spyOn(globalThis, 'fetch').mockImplementation(async () => page([alert('row-' + n), { properties: { id: 'invalid' } }], 'https://api.weather.gov/alerts?cursor=' + ++n));
  const result = await fetchFeed(source);
  expect(result.health).toMatchObject({ state: 'partial', pages: 8, truncated: true, rejected: 8 });
  expect(selectHappeningNow(result.items, NOW)).toEqual([]);
});

it('does not group similar warnings lacking authoritative event identity', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(page([alert('one', { parameters: {} }), alert('two', { parameters: {} })]));
  expect(deduplicateItems((await fetchFeed(source)).items)).toHaveLength(2);
});

it('preserves check times through cache reads, failure, expiry, and empty recovery', async () => {
  const fetcher = jest.spyOn(globalThis, 'fetch').mockResolvedValue(page([alert('one')]));
  const initial = await fetchFeed(source);
  jest.setSystemTime(NOW + 60_000);
  expect((await fetchFeed(source)).health.lastSuccessAt).toBe(initial.health.lastSuccessAt);
  expect(fetcher).toHaveBeenCalledTimes(1);
  jest.setSystemTime(NOW + 121_000); fetcher.mockResolvedValue(new Response('down', { status: 503 }));
  const delayed = await fetchFeed(source);
  expect(delayed.health).toMatchObject({ state: 'delayed', lastSuccessAt: initial.health.lastSuccessAt });
  expect(selectHappeningNow(delayed.items)).toEqual([]);
  jest.setSystemTime(NOW + 61 * 60_000);
  expect(await fetchFeed(source)).toMatchObject({ items: [], health: { state: 'unavailable', lastSuccessAt: initial.health.lastSuccessAt } });
  jest.setSystemTime(NOW + 62 * 60_000); fetcher.mockResolvedValue(page([]));
  expect(await fetchFeed(source)).toMatchObject({ items: [], health: { state: 'fresh', accepted: 0 } });
});

it('retires source freshness and retention on an open page without fabricating a check', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(page([alert('one')]));
  const result = await fetchFeed(source);
  const aged = projectNewsSnapshot(result.items, [result.health], NOW + 5 * 60_000);
  expect(aged.items).toEqual([]);
  expect(aged.delayedItems[0].lifecycle).toBe('unverified');
  expect(aged.sources[0].lastSuccessAt).toBe(result.health.lastSuccessAt);
  expect(projectNewsSnapshot(result.items, [result.health], NOW + 60 * 60_000).delayedItems).toEqual([]);
});

it('replays recorded NWS fields without treating the excerpt as national coverage', async () => {
  const fixture = JSON.parse(readFileSync('__tests__/fixtures/news/nws-2026-10-11.json', 'utf8'));
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ...fixture, pagination: { next: 'invalid' } }));
  const result = await fetchFeed(source);
  expect(result.health).toMatchObject({ state: 'partial', received: 6, rejected: 0 });
  expect(result.items.every(item => item.warning?.office && item.warning.areas.length && item.hazard?.messageId)).toBe(true);
});

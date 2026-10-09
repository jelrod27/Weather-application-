/** @jest-environment node */

import * as Sentry from '@sentry/nextjs';
import { FEED_SOURCES } from '@/lib/services/rss/feedSources';
import { fetchFeed } from '@/lib/services/rss/fetch-feed';

jest.mock('@sentry/nextjs', () => ({
  addBreadcrumb: jest.fn(),
  captureMessage: jest.fn(),
}));

const nwsSource = FEED_SOURCES.find(source => source.id === 'nws-alerts');
if (!nwsSource) throw new Error('NWS news source must be configured');

const alertFeed = `<?xml version="1.0"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <entry>
      <id>urn:oid:test-alert</id>
      <title>Flash Flood Warning</title>
      <link rel="alternate" href="https://api.weather.gov/alerts/urn:oid:test-alert" />
      <summary>Flash flooding is ongoing.</summary>
      <updated>2026-10-05T20:00:00Z</updated>
    </entry>
  </feed>`;

describe('NWS news feed', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('fetches filtered active alerts using Atom content negotiation', async () => {
    // Provider contract verified against NWS OpenAPI and live responses:
    // /alerts/active supports filters; /alerts/active.atom rejects them.
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      const acceptsAtom = new Headers(init?.headers).get('Accept')?.includes('application/atom+xml');
      if (url.pathname !== '/alerts/active' || !acceptsAtom) {
        return new Response('Unsupported alert endpoint or format', { status: 400 });
      }
      return new Response(alertFeed, { headers: { 'Content-Type': 'application/atom+xml' } });
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const items = await fetchFeed(nwsSource);

    expect(items).toEqual([
      expect.objectContaining({ sourceId: 'nws-alerts', category: 'severe', title: 'Flash Flood Warning' }),
    ]);
    const [input, options] = fetchMock.mock.calls[0];
    const url = new URL(String(input));
    expect(url.origin).toBe('https://api.weather.gov');
    expect(url.searchParams.get('severity')).toBe('Severe,Extreme');
    expect(url.searchParams.get('urgency')).toBe('Immediate,Expected');
    expect(options).toEqual(expect.objectContaining({ next: { revalidate: 300 } }));
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('still reports a genuine high-priority upstream failure', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Unavailable', { status: 503 }));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(await fetchFeed(nwsSource)).toEqual([]);
    expect(Sentry.captureMessage).toHaveBeenCalledWith('[news] high-priority feed down', {
      level: 'warning',
      tags: { context: 'news', sourceId: 'nws-alerts' },
      extra: { source: 'nws-alerts', category: 'severe', reason: 'HTTP 503' },
    });
  });
});

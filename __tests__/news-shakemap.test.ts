/** @jest-environment node */
import { enrichItemImages } from '@/lib/services/rss/enrich-images';
import type { RSSItem } from '@/lib/services/rss/parse-feed';

const freeze: RSSItem = { id: 'test', title: 'M 5.1 test', description: '', url: 'https://earthquake.usgs.gov',
 source: 'USGS', sourceId: 'usgs-m45', category: 'earthquakes', priority: 'medium', timestamp: new Date(), magnitude: 5.1 };

describe('event-bound ShakeMaps', () => {
  it.each([
    ['/earthquakes/eventpage/relative123', 'usrelative123'],
    ['https://[invalid', 'usmalformed123'],
    ['https://example.com/earthquakes/eventpage/foreign123', 'usforeign123'],
  ])('keeps the batch available when an earthquake link is unusable: %s', async (url, eventId) => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id: eventId,
      properties: { products: { shakemap: [{ contents: {
        'download/intensity.jpg': { url: 'https://earthquake.usgs.gov/product/intensity.jpg' },
      } }] } },
    }), { status: 200 }));
    try {
      const items = await enrichItemImages([
        { ...freeze, id: 'unusable-link', url },
        { ...freeze, id: eventId, url: `https://earthquake.usgs.gov/earthquakes/eventpage/${eventId}` },
      ]);
      expect(items.map((item) => item.id)).toEqual(['unusable-link', eventId]);
      expect(items[0].image).toBeUndefined();
      expect(items[1].image).toMatchObject({ kind: 'product', credit: 'USGS ShakeMap' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        `https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/${eventId}.geojson`, expect.any(Object),
      );
    } finally { fetchMock.mockRestore(); }
  });

  it.each([true, false])('only uses a ShakeMap when USGS confirms event identity (match=%s)', async (matches) => {
    const eventId = matches ? 'usmatch123' : 'uswrong123';
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id: matches ? eventId : 'different-event',
      properties: { products: { shakemap: [{ updateTime: Date.parse('2026-10-11T17:00:00Z'), contents: {
        'download/intensity.jpg': { url: 'https://earthquake.usgs.gov/product/intensity.jpg' },
      } }] } },
    }), { status: 200 }));
    try {
      const [item] = await enrichItemImages([{ ...freeze, id: eventId, sourceId: 'usgs-m45', category: 'earthquakes',
        url: `https://earthquake.usgs.gov/earthquakes/eventpage/${eventId}`, hazard: undefined }]);
      if (matches) expect(item.image).toMatchObject({ kind: 'product', credit: 'USGS ShakeMap', issuedAt: '2026-10-11T17:00:00.000Z' });
      else expect(item.image).toBeUndefined();
    } finally { fetchMock.mockRestore(); }
  });
});

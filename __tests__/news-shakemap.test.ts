/** @jest-environment node */
import { enrichItemImages } from '@/lib/services/rss/enrich-images';
import type { RSSItem } from '@/lib/services/rss/parse-feed';

const freeze: RSSItem = { id: 'test', title: 'M 5.1 test', description: '', url: 'https://earthquake.usgs.gov',
 source: 'USGS', sourceId: 'usgs-m45', category: 'earthquakes', priority: 'medium', timestamp: new Date(), magnitude: 5.1 };

describe('event-bound ShakeMaps', () => {
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

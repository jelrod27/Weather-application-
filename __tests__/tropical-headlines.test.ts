import {
  isActiveTropicalHeadline,
  isDiscoveryHeadline,
} from '@/lib/news/tropical-headlines';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';

function item(partial: Partial<RSSItem> & Pick<RSSItem, 'id' | 'title' | 'category'>): RSSItem {
  return {
    description: '',
    url: 'https://example.com',
    source: 'Test',
    sourceId: 'test',
    priority: 'high',
    timestamp: new Date(),
    ...partial,
  };
}

describe('tropical-headlines', () => {
  describe('isActiveTropicalHeadline', () => {
    it('rejects calm-basin NHC posts', () => {
      expect(
        isActiveTropicalHeadline({
          title: 'There are no tropical cyclones at this time.',
          description: '',
          category: 'hurricanes',
        }),
      ).toBe(false);
      expect(
        isActiveTropicalHeadline({
          title: 'Atlantic Tropical Weather Outlook',
          description: '',
          category: 'hurricanes',
        }),
      ).toBe(false);
    });

    it('accepts active tropical warnings and named storms', () => {
      expect(
        isActiveTropicalHeadline({
          title: 'Hurricane Warning issued for Example County',
          description: '',
          category: 'hurricanes',
        }),
      ).toBe(true);
      expect(
        isActiveTropicalHeadline({
          title: 'Special Tropical Weather Outlook issued',
          description: '',
          category: 'hurricanes',
        }),
      ).toBe(true);
      expect(
        isActiveTropicalHeadline({
          title: 'Tropical Storm Debby Advisory Number 8',
          description: '',
          category: 'hurricanes',
        }),
      ).toBe(true);
    });

    it('passes through non-hurricane categories', () => {
      expect(
        isActiveTropicalHeadline({
          title: 'M6.1 earthquake',
          description: '',
          category: 'earthquakes',
        }),
      ).toBe(true);
    });
  });

  describe('isDiscoveryHeadline', () => {
    it('requires high priority', () => {
      expect(
        isDiscoveryHeadline(
          item({
            id: '1',
            title: 'Hurricane Warning',
            category: 'hurricanes',
            priority: 'low',
          }),
        ),
      ).toBe(false);
    });

    it('filters calm tropical high-priority items', () => {
      expect(
        isDiscoveryHeadline(
          item({
            id: '1',
            title: 'There are no tropical cyclones at this time.',
            category: 'hurricanes',
          }),
        ),
      ).toBe(false);
    });
  });
});

import {
  isHurricaneSeason,
  selectFeaturedItem,
  selectHappeningNow,
} from '@/lib/news/rails';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';

function item(overrides: Partial<RSSItem> = {}): RSSItem {
  return {
    id: 'id-1',
    title: 'Title',
    description: '',
    url: 'https://example.com/a',
    source: 'Test',
    sourceId: 'test',
    category: 'science',
    priority: 'medium',
    timestamp: new Date('2026-06-26T12:00:00Z'),
    ...overrides,
  };
}

describe('news rails', () => {
  it('excludes recent articles without verified active warning evidence', () => {
    const recent = item({ id: 'recent', priority: 'high', timestamp: new Date('2026-06-26T11:00:00Z') });
    const old = item({ id: 'old', priority: 'high', timestamp: new Date('2026-06-25T00:00:00Z') });
    const low = item({ id: 'low', priority: 'low', timestamp: new Date('2026-06-26T11:30:00Z') });

    const now = new Date('2026-06-26T12:00:00Z').getTime();
    expect(selectHappeningNow([recent, old, low], now)).toEqual([]);
  });

  it('prefers happening-now for featured selection', () => {
    const happening = item({ id: 'happening', priority: 'high', category: 'severe' });
    const other = item({ id: 'other', priority: 'high', category: 'science' });
    expect(selectFeaturedItem([other, happening], [happening])).toEqual(happening);
  });

  it('includes active hurricanes in featured selection during hurricane season', () => {
    const tropical = item({
      id: 'tropical',
      priority: 'high',
      category: 'hurricanes',
      title: 'Hurricane Warning issued for Example County',
    });
    const science = item({ id: 'science', priority: 'medium', category: 'science' });
    const july = new Date('2026-07-01T12:00:00Z');
    expect(isHurricaneSeason(july)).toBe(true);
    expect(selectFeaturedItem([science, tropical], [], july)).toEqual(tropical);
  });

  it('excludes calm tropical posts from featured selection during hurricane season', () => {
    const tropical = item({
      id: 'tropical',
      priority: 'high',
      category: 'hurricanes',
      title: 'There are no tropical cyclones at this time.',
    });
    const science = item({ id: 'science', priority: 'high', category: 'science' });
    const july = new Date('2026-07-01T12:00:00Z');
    expect(selectFeaturedItem([tropical, science], [], july)).toEqual(science);
  });

  it('excludes hurricanes from featured selection off-season', () => {
    const tropical = item({ id: 'tropical', priority: 'high', category: 'hurricanes' });
    const science = item({ id: 'science', priority: 'high', category: 'science' });
    const january = new Date('2026-01-15T12:00:00Z');
    expect(isHurricaneSeason(january)).toBe(false);
    expect(selectFeaturedItem([tropical, science], [], january)).toEqual(science);
  });

});

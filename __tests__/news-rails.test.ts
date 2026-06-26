import {
  excludeRailIds,
  groupItemsByCategory,
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
  it('selects high-priority items within the happening-now window', () => {
    const recent = item({ id: 'recent', priority: 'high', timestamp: new Date('2026-06-26T11:00:00Z') });
    const old = item({ id: 'old', priority: 'high', timestamp: new Date('2026-06-25T00:00:00Z') });
    const low = item({ id: 'low', priority: 'low', timestamp: new Date('2026-06-26T11:30:00Z') });

    const now = new Date('2026-06-26T12:00:00Z').getTime();
    expect(selectHappeningNow([recent, old, low], now)).toEqual([recent]);
  });

  it('prefers happening-now for featured selection', () => {
    const happening = item({ id: 'happening', priority: 'high', category: 'severe' });
    const other = item({ id: 'other', priority: 'high', category: 'science' });
    expect(selectFeaturedItem([other, happening], [happening])).toEqual(happening);
  });

  it('includes hurricanes in featured selection during hurricane season', () => {
    const tropical = item({ id: 'tropical', priority: 'high', category: 'hurricanes' });
    const science = item({ id: 'science', priority: 'medium', category: 'science' });
    const july = new Date('2026-07-01T12:00:00Z');
    expect(isHurricaneSeason(july)).toBe(true);
    expect(selectFeaturedItem([science, tropical], [], july)).toEqual(tropical);
  });

  it('excludes hurricanes from featured selection off-season', () => {
    const tropical = item({ id: 'tropical', priority: 'high', category: 'hurricanes' });
    const science = item({ id: 'science', priority: 'high', category: 'science' });
    const january = new Date('2026-01-15T12:00:00Z');
    expect(isHurricaneSeason(january)).toBe(false);
    expect(selectFeaturedItem([tropical, science], [], january)).toEqual(science);
  });

  it('dedupes rail ids from the main grid pool', () => {
    const featured = item({ id: 'featured' });
    const grid = item({ id: 'grid' });
    expect(excludeRailIds([featured, grid], [featured])).toEqual([grid]);
  });

  it('groups home sections in hazard-first order', () => {
    const sections = groupItemsByCategory([
      item({ id: 'science', category: 'science' }),
      item({ id: 'severe', category: 'severe' }),
      item({ id: 'quake', category: 'earthquakes' }),
    ]);
    expect(sections.map((section) => section.category)).toEqual(['severe', 'earthquakes', 'science']);
  });
});

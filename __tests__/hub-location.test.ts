import {
  isGeographicallyRelatedToUser,
  isHeadlineRelevantToUser,
  shouldShowStargazerCard,
} from '@/lib/home/hub-location';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';

const NYC = {
  lat: 40.7128,
  lon: -74.006,
  locationLabel: 'New York, NY',
  country: 'US',
};

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

describe('hub-location', () => {
  it('matches user state and city in text', () => {
    expect(
      isGeographicallyRelatedToUser('severe thunderstorm warning for new york ny', NYC),
    ).toBe(true);
    expect(isGeographicallyRelatedToUser('earthquake near tokyo', NYC)).toBe(false);
  });

  it('does not match "us" inside unrelated words', () => {
    expect(
      isGeographicallyRelatedToUser('Flood Warning issued June 26 at 10:10PM CDT', NYC),
    ).toBe(false);
  });

  it('does not false-positive Oregon on the word "or"', () => {
    const portland = {
      lat: 45.5152,
      lon: -122.6784,
      locationLabel: 'Portland, OR',
      country: 'US',
    };
    expect(isGeographicallyRelatedToUser('hail 1 inch or higher expected', portland)).toBe(false);
    expect(
      isGeographicallyRelatedToUser('severe thunderstorm warning for portland, or', portland),
    ).toBe(true);
  });

  it('matches space-separated state tokens for unambiguous codes', () => {
    expect(
      isGeographicallyRelatedToUser('severe thunderstorm warning for new york ny', NYC),
    ).toBe(true);
  });

  it('shows nearby moderate quakes but not distant ones', () => {
    expect(
      isHeadlineRelevantToUser(
        item({
          id: '1',
          title: 'M5.3 - 10 km NE of New York, NY',
          category: 'earthquakes',
          magnitude: 5.3,
        }),
        NYC,
      ),
    ).toBe(true);
    expect(
      isHeadlineRelevantToUser(
        item({
          id: '2',
          title: 'M5.3 - 10 km NE of Palu, Indonesia',
          category: 'earthquakes',
          magnitude: 5.3,
        }),
        NYC,
      ),
    ).toBe(false);
  });

  it('shows major global quakes', () => {
    expect(
      isHeadlineRelevantToUser(
        item({
          id: '3',
          title: 'M6.4 - 10 km NE of Palu, Indonesia',
          category: 'earthquakes',
          magnitude: 6.4,
        }),
        NYC,
      ),
    ).toBe(true);
  });

  it('surfaces stargazer whenever a score is available', () => {
    expect(shouldShowStargazerCard({ score: 70, needsLocation: false, loading: false })).toBe(true);
    expect(shouldShowStargazerCard({ score: 45, needsLocation: false, loading: false })).toBe(true);
    expect(shouldShowStargazerCard({ score: null, needsLocation: false, loading: false })).toBe(false);
  });
});

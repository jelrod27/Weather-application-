import {
  formatUpdatedAgo,
  pickHappeningNowHeadline,
  shouldShowHubAlerts,
  shouldShowHubHeadline,
  shouldShowSpcOutlook,
  shouldShowStargazerCard,
  summarizeAlerts,
  truncateText,
  type HubUserLocation,
} from '@/lib/home/hub-utils';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';

const NYC: HubUserLocation = {
  lat: 40.7128,
  lon: -74.006,
  locationLabel: 'New York, NY',
  country: 'US',
};

describe('hub-utils', () => {
  describe('formatUpdatedAgo', () => {
    it('formats recent timestamps', () => {
      const now = new Date('2026-06-25T12:00:00Z');
      jest.useFakeTimers().setSystemTime(now);
      expect(formatUpdatedAgo(new Date('2026-06-25T11:58:00Z'))).toBe('2m ago');
      jest.useRealTimers();
    });
  });

  describe('pickHappeningNowHeadline', () => {
    it('skips items that are not relevant to the user', () => {
      const happening = [
        {
          id: 'far',
          title: 'M5.1 - 10 km NE of Palu, Indonesia',
          category: 'earthquakes',
          priority: 'high',
          magnitude: 5.1,
        },
        {
          id: 'near',
          title: 'Severe Thunderstorm Warning issued for New York NY',
          category: 'severe',
          priority: 'high',
        },
      ] as RSSItem[];
      expect(pickHappeningNowHeadline(happening, NYC)?.id).toBe('near');
    });
  });

  describe('shouldShowHubAlerts', () => {
    it('hides when all clear', () => {
      expect(shouldShowHubAlerts({ count: 0, needsLocation: false, loading: false })).toBe(false);
    });

    it('shows when alerts are active', () => {
      expect(shouldShowHubAlerts({ count: 2, needsLocation: false, loading: false })).toBe(true);
    });
  });

  describe('shouldShowSpcOutlook', () => {
    it('shows slight risk or higher in-region', () => {
      expect(shouldShowSpcOutlook('SLGT', false, true)).toBe(true);
      expect(shouldShowSpcOutlook('SLGT', false, false)).toBe(false);
    });
  });

  describe('shouldShowStargazerCard', () => {
    it('shows whenever a score is available', () => {
      expect(
        shouldShowStargazerCard({ score: 72, needsLocation: false, loading: false }),
      ).toBe(true);
      expect(
        shouldShowStargazerCard({ score: 25, needsLocation: false, loading: false }),
      ).toBe(true);
      expect(
        shouldShowStargazerCard({ score: 50, needsLocation: false, loading: false }),
      ).toBe(true);
      expect(
        shouldShowStargazerCard({ score: null, needsLocation: false, loading: false }),
      ).toBe(false);
    });
  });

  describe('shouldShowHubHeadline', () => {
    it('shows when a headline is loaded', () => {
      expect(
        shouldShowHubHeadline({ title: 'Severe storms in NY', loading: false }),
      ).toBe(true);
    });
  });

  describe('summarizeAlerts', () => {
    it('returns all clear when empty', () => {
      expect(summarizeAlerts([])).toEqual({
        count: 0,
        headline: 'No active alerts nearby',
        severity: null,
        topAlertId: null,
      });
    });
  });

  describe('truncateText', () => {
    it('truncates long strings', () => {
      expect(truncateText('abcdefghijklmnop', 10)).toBe('abcdefghij…');
    });
  });
});

/** Synthetic news records for pagination, clock, and reading-state tests. Not provider observations. */
import { selectNewsSections } from '../../lib/news/sections';
import { isVerifiedActiveWarning } from '../../lib/news/rails';
import type { NewsBrowseOptions, NewsBrowseResult } from '../../lib/news/sections';
import type { NewsSourceHealth } from '../../lib/news/types';
import type { RSSItem } from '../../lib/services/rss/parse-feed';

export const NEWS_EPOCH = Date.parse('2026-10-11T22:50:00Z');
export const newsTime = (offset: number): string => new Date(NEWS_EPOCH + offset).toISOString();

export function newsItem(overrides: Partial<RSSItem> = {}): RSSItem {
  return {
    id: 'reading-1', title: 'How clouds form', description: 'Synthetic weather reading fixture.',
    url: 'https://www.noaa.gov/news/clouds', source: 'NOAA Science', sourceId: 'science',
    category: 'science', priority: 'medium', timestamp: new Date(NEWS_EPOCH - 60_000),
    kind: 'story', sourceState: 'fresh', sourceCheckedAt: newsTime(0), freshUntil: newsTime(3600_000),
    ...overrides,
  };
}

export function newsWarning(overrides: Partial<RSSItem> = {}): RSSItem {
  return newsItem({
    id: 'nws:synthetic', title: 'Tornado Warning for Example County', description: 'Synthetic warning fixture.',
    url: 'https://www.weather.gov/alerts', source: 'NWS', sourceId: 'nws-alerts', category: 'severe', priority: 'high',
    kind: 'hazard', lifecycle: 'active', freshUntil: newsTime(300_000), location: 'Example County, TX',
    hazard: { event: 'Tornado Warning', effective: newsTime(-60_000), expires: newsTime(180_000) },
    warning: { office: 'KFWD', severity: 'Extreme', urgency: 'Immediate', certainty: 'Observed', messageType: 'Alert', action: 'NEW',
      sent: newsTime(-60_000), effective: newsTime(-60_000), expires: newsTime(180_000), ends: '', areas: ['TXC001'] },
    ...overrides,
  });
}

export function newsSource(overrides: Partial<NewsSourceHealth> = {}): NewsSourceHealth {
  return {
    id: 'nws-alerts', name: 'NWS', url: 'https://www.weather.gov/alerts', state: 'fresh',
    lastAttemptAt: newsTime(0), lastSuccessAt: newsTime(0), freshUntil: newsTime(300_000), retainedUntil: newsTime(3600_000),
    coverage: 'Synthetic national NWS coverage', received: 1, accepted: 1, rejected: 0, truncated: false, pages: 1,
    oldestItemAt: newsTime(-60_000), newestItemAt: newsTime(-60_000), issues: [], ...overrides,
  };
}

export function newsBrowse(items: RSSItem[] = [newsWarning(), newsItem()], options: NewsBrowseOptions = {}): NewsBrowseResult {
  return {
    sections: selectNewsSections(items, options, NEWS_EPOCH),
    sources: [newsSource(), newsSource({ id: 'science', name: 'NOAA Science', freshUntil: newsTime(3600_000), retainedUntil: newsTime(7200_000) })],
    activeIds: items.filter(item => isVerifiedActiveWarning(item, NEWS_EPOCH)).map(item => item.id),
    lastUpdated: newsTime(0),
  };
}

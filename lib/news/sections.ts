import { compareActiveWarnings, isVerifiedActiveWarning } from './rails';
import type { RSSItem } from '@/lib/services/rss/parse-feed';
import type { NewsSourceHealth } from './types';

export const NEWS_SECTION_IDS = ['active', 'reports', 'reading', 'delayed'] as const;
export type NewsSectionId = typeof NEWS_SECTION_IDS[number];
export const NEWS_PAGE_SIZE = 24;
interface NewsSectionConfig {
  title: string;
  description: string;
  previewSize: number;
}

export const NEWS_SECTIONS: Record<NewsSectionId, NewsSectionConfig> = {
  active: { title: 'HAPPENING NOW', description: 'Verified active NWS warnings. Tornado, flash flood, and severe thunderstorm warnings lead; severity and urgency, then newest issue time, order each tier.', previewSize: 4 },
  reports: { title: 'OUTLOOKS & RECENT REPORTS', description: 'Forecasts, earthquakes, tropical updates, and other hazard reports. These do not establish verified active conditions.', previewSize: 3 },
  reading: { title: 'WEATHER & SCIENCE READING', description: 'Weather explanations, research, space, and climate stories, newest first.', previewSize: 3 },
  delayed: { title: 'DELAYED REPORTS', description: 'Last-known reports. Current conditions cannot be verified from these sources.', previewSize: 3 },
};

export interface NewsSectionPage {
  id: NewsSectionId;
  items: RSSItem[];
  total: number;
  offset: number;
  hasMore: boolean;
}

export interface NewsBrowseOptions {
  section?: NewsSectionId;
  query?: string;
  offset?: number;
}

export interface NewsBrowseResult {
  sections: NewsSectionPage[];
  sources: NewsSourceHealth[];
  lastUpdated: string;
  /** Complete verified NWS ID set, so a background check can retire cancelled visible cards. */
  activeIds: string[];
  /** Client projection can retain loaded cards without knowing the remaining collection's counts. */
  countsArePartial?: boolean;
}

export function newsSection(item: RSSItem, now = Date.now()): NewsSectionId {
  if (item.sourceState === 'delayed' || item.sourceState === 'unavailable' ||
      (item.sourceId === 'nws-alerts' && item.sourceState === 'partial')) return 'delayed';
  if (isVerifiedActiveWarning(item, now)) return 'active';
  if (item.kind === 'story' || (!item.kind && ['science', 'space', 'climate'].includes(item.category))) return 'reading';
  return 'reports';
}

/** Search and pagination run over the whole bounded source collection, before image work. */
export function selectNewsSections(items: RSSItem[], options: NewsBrowseOptions = {}, now = Date.now()): NewsSectionPage[] {
  const query = options.query?.trim().toLowerCase() ?? '';
  const grouped: Record<NewsSectionId, RSSItem[]> = { active: [], reports: [], reading: [], delayed: [] };
  for (const item of items) {
    if (query && ![item.title, item.description, item.source, item.location, item.hazard?.event, item.warning?.office,
      ...(item.warning?.areas ?? []), ...(item.updates?.map(update => update.title) ?? [])]
      .some(value => value?.toLowerCase().includes(query))) continue;
    grouped[newsSection(item, now)].push(item);
  }
  return (options.section ? [options.section] : NEWS_SECTION_IDS).map(id => {
    const sorted = grouped[id].sort(id === 'active' ? compareActiveWarnings
      : (a, b) => b.timestamp.getTime() - a.timestamp.getTime() || a.id.localeCompare(b.id, 'en'));
    const limit = options.section ? NEWS_PAGE_SIZE : NEWS_SECTIONS[id].previewSize;
    // A live set can shrink between pages. Return its last valid page, never a stranded empty page.
    const requested = Number.isFinite(options.offset) ? Math.max(0, Math.floor(options.offset! / limit) * limit) : 0;
    const offset = options.section ? Math.min(requested, Math.max(0, Math.ceil(sorted.length / limit) - 1) * limit) : 0;
    return { id, items: sorted.slice(offset, offset + limit), total: sorted.length, offset, hasMore: offset + limit < sorted.length };
  });
}

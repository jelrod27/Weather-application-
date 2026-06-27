import type { FeedCategory } from '@/lib/services/rss/feedSources';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';
import { isActiveTropicalHeadline, isDiscoveryHeadline } from '@/lib/news/tropical-headlines';

export const HAPPENING_NOW_WINDOW_MS = 6 * 60 * 60 * 1000;
export const HAPPENING_NOW_MAX = 8;

/** Home view section order — hazards first, research last. */
export const HOME_SECTION_ORDER: FeedCategory[] = [
  'severe',
  'hurricanes',
  'earthquakes',
  'volcanoes',
  'space',
  'climate',
  'science',
];

export function isHurricaneSeason(now = new Date()): boolean {
  const month = now.getUTCMonth();
  return month >= 5 && month <= 10;
}

export function selectHappeningNow(items: RSSItem[], now = Date.now()): RSSItem[] {
  const cutoff = now - HAPPENING_NOW_WINDOW_MS;
  return items
    .filter(
      (item) =>
        item.priority === 'high' &&
        item.timestamp.getTime() > 0 &&
        item.timestamp.getTime() >= cutoff &&
        isDiscoveryHeadline(item),
    )
    .slice(0, HAPPENING_NOW_MAX);
}

export function selectFeaturedItem(
  items: RSSItem[],
  happeningNow: RSSItem[],
  now = new Date(),
): RSSItem | null {
  if (happeningNow.length > 0) return happeningNow[0];

  const includeTropical = isHurricaneSeason(now);
  const pool = includeTropical ? items : items.filter((item) => item.category !== 'hurricanes');

  const highPriority = pool.filter(
    (item) => item.priority === 'high' && isActiveTropicalHeadline(item),
  );
  if (highPriority.length > 0) return highPriority[0];

  const actionablePool = pool.filter(
    (item) => item.category !== 'hurricanes' || isActiveTropicalHeadline(item),
  );
  return actionablePool[0] ?? items[0] ?? null;
}

export function excludeRailIds(items: RSSItem[], rails: RSSItem[]): RSSItem[] {
  const ids = new Set(rails.map((item) => item.id));
  return items.filter((item) => !ids.has(item.id));
}

export function groupItemsByCategory(
  items: RSSItem[],
): Array<{ category: FeedCategory; items: RSSItem[] }> {
  const byCategory = new Map<FeedCategory, RSSItem[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  return HOME_SECTION_ORDER.filter((category) => (byCategory.get(category)?.length ?? 0) > 0).map(
    (category) => ({
      category,
      items: byCategory.get(category)!,
    }),
  );
}

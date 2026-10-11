import type { FeedCategory } from '@/lib/services/rss/feedSources';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';
import { isActiveTropicalHeadline } from '@/lib/news/tropical-headlines';

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
  return items
    .filter(item => isVerifiedActiveWarning(item, now))
    .slice(0, HAPPENING_NOW_MAX);
}

export function isVerifiedActiveWarning(item: RSSItem, now = Date.now()): boolean {
  const warning = item.warning;
  if (item.sourceId !== 'nws-alerts' || item.kind !== 'hazard' || item.lifecycle !== 'active' ||
      item.sourceState !== 'fresh' || !item.freshUntil || Date.parse(item.freshUntil) <= now || !warning ||
      !/\bwarning\b/i.test(item.hazard?.event ?? '') || warning.messageType === 'Cancel' ||
      ['CAN', 'EXP', 'UPG'].includes(warning.action ?? '')) return false;
  const effective = Date.parse(warning.effective);
  const expires = Date.parse(warning.expires);
  const ends = warning.ends ? Date.parse(warning.ends) : expires;
  return Number.isFinite(Date.parse(item.freshUntil)) && Number.isFinite(effective) && effective <= now &&
    Number.isFinite(expires) && Number.isFinite(ends) && Math.min(expires, ends) > now;
}

export function selectFeaturedItem(
  items: RSSItem[],
  happeningNow: RSSItem[],
  now = new Date(),
): RSSItem | null {
  items = items.filter(item => item.sourceState !== 'delayed' && item.sourceState !== 'unavailable');
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

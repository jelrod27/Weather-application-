import type { RSSItem } from '@/lib/services/rss/rssAggregator';
import { isActiveTropicalHeadline } from '@/lib/news/tropical-headlines';
import { compareWarningImportance } from '@/lib/warnings/priority';

export const HAPPENING_NOW_MAX = 8;

export function isHurricaneSeason(now = new Date()): boolean {
  const month = now.getUTCMonth();
  return month >= 5 && month <= 10;
}

export function selectHappeningNow(items: RSSItem[], now = Date.now()): RSSItem[] {
  return items
    .filter(item => isVerifiedActiveWarning(item, now))
    .sort(compareActiveWarnings)
    .slice(0, HAPPENING_NOW_MAX);
}

export function compareActiveWarnings(a: RSSItem, b: RSSItem): number {
  return compareWarningImportance(
    { event: a.hazard?.event ?? '', severity: a.warning?.severity ?? 'Unknown', urgency: a.warning?.urgency ?? 'Unknown' },
    { event: b.hazard?.event ?? '', severity: b.warning?.severity ?? 'Unknown', urgency: b.warning?.urgency ?? 'Unknown' },
  ) || b.timestamp.getTime() - a.timestamp.getTime() || a.id.localeCompare(b.id, 'en');
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

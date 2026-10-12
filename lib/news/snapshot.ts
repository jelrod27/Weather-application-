import { isVerifiedActiveWarning } from './rails';
import type { NewsSourceHealth } from './types';
import type { RSSItem } from '@/lib/services/rss/parse-feed';

interface NewsSnapshot {
  items: RSSItem[];
  delayedItems: RSSItem[];
  sources: NewsSourceHealth[];
}

/** Re-evaluate cached evidence without changing the time it was checked. */
export function projectNewsSnapshot(items: RSSItem[], sources: NewsSourceHealth[], now = Date.now()): NewsSnapshot {
  const agedSources = sources.map(source => {
    const retained = source.retainedUntil && Date.parse(source.retainedUntil) > now;
    const fresh = source.freshUntil && Date.parse(source.freshUntil) > now;
    return { ...source, state: !retained ? 'unavailable' as const
      : !fresh && (source.state === 'fresh' || source.state === 'partial') ? 'delayed' as const : source.state };
  });
  const byId = new Map(agedSources.map(source => [source.id, source]));
  const result: NewsSnapshot = { items: [], delayedItems: [], sources: agedSources };
  for (const original of items) {
    const source = byId.get(original.sourceId);
    if (source?.state === 'unavailable') continue;
    const state = source?.state ?? original.sourceState;
    const item = { ...original, sourceState: state };
    if (item.lifecycle === 'active' && !isVerifiedActiveWarning(item, now)) item.lifecycle = 'unverified';
    if (state === 'delayed' || state === 'unavailable' || (state === 'partial' && item.sourceId === 'nws-alerts')) {
      result.delayedItems.push(item);
    } else result.items.push(item);
  }
  return result;
}

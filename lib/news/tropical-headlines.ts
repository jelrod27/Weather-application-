import type { RSSItem } from '@/lib/services/rss/rssAggregator';

/** Routine NHC posts when the basin is quiet — not actionable on discovery surfaces. */
const TROPICAL_CALM_PATTERNS = [
  /no tropical cyclones/i,
  /there are no tropical/i,
  /no (active )?(tropical cyclones|hurricanes)/i,
  /tropical weather outlook/i,
  /two-day graphical tropical weather outlook/i,
  /five-day graphical tropical weather outlook/i,
  /\bgtwo\b/i,
];

/** Active tropical hazards worth surfacing (warnings, watches, named systems). */
const TROPICAL_ACTIVE_PATTERNS = [
  /(hurricane|tropical storm|typhoon) (warning|watch|advisory)/i,
  /storm surge (warning|watch)/i,
  /potential tropical cyclone/i,
  /(hurricane|tropical storm|typhoon) [A-Z][a-z]{2,}/i,
  /post-tropical cyclone.*(warning|watch|advisory)/i,
  /special (tropical|hurricane) weather outlook/i,
  /extreme wind warning/i,
];

function tropicalText(item: Pick<RSSItem, 'title' | 'description'>): string {
  return `${item.title} ${item.description ?? ''}`.trim();
}

/** True when a hurricanes-category item reflects an active tropical warning or named system. */
export function isActiveTropicalHeadline(item: Pick<RSSItem, 'title' | 'description' | 'category'>): boolean {
  if (item.category !== 'hurricanes') return true;

  const text = tropicalText(item);
  if (TROPICAL_ACTIVE_PATTERNS.some((pattern) => pattern.test(text))) {
    return true;
  }
  if (TROPICAL_CALM_PATTERNS.some((pattern) => pattern.test(text))) {
    return false;
  }
  return false;
}

/** High-priority headlines suitable for home hub / happening-now discovery. */
export function isDiscoveryHeadline(item: RSSItem): boolean {
  if (item.priority !== 'high') return false;
  return isActiveTropicalHeadline(item);
}

import type { FeedCategory } from '@/lib/services/rss/feedSources';

export interface NewsImage {
  url: string;
  kind: 'product' | 'editorial' | 'reference';
  alt: string;
  credit: string;
  sourceUrl: string;
  caption: string;
  issuedAt?: string;
  validFrom?: string;
  validUntil?: string;
}

/** Facts carried from the issuing authority, not inferred from the headline. */
export interface NewsHazard {
  messageId?: string;
  event: string;
  effective?: string;
  expires?: string;
}

export type HazardFamily = 'tornado' | 'thunderstorm' | 'wind' | 'freeze' |
  'flash-flood' | 'flood' | 'fire' | 'marine' | 'winter' | 'tropical' | 'other';

const HAZARD_FAMILIES: Array<[RegExp, HazardFamily]> = [
  [/tornado/i, 'tornado'],
  [/severe thunderstorm/i, 'thunderstorm'],
  [/flash flood/i, 'flash-flood'],
  [/flood/i, 'flood'],
  [/freeze|frost/i, 'freeze'],
  [/red flag|fire weather/i, 'fire'],
  [/marine|gale|storm force|hazardous seas/i, 'marine'],
  [/blizzard|winter|ice storm|snow|sleet/i, 'winter'],
  [/high wind|wind advisory|extreme wind/i, 'wind'],
  [/hurricane|tropical/i, 'tropical'],
];

export function hazardFamily(item: { category: FeedCategory; hazard?: NewsHazard }): HazardFamily | undefined {
  if (item.hazard) {
    const event = item.hazard.event;
    return HAZARD_FAMILIES.find(([pattern]) => pattern.test(event))?.[1] ?? 'other';
  }
  if (item.category === 'hurricanes') return 'tropical';
  if (item.category === 'severe') return 'other';
  return undefined;
}

export function isoTimestamp(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
}

/** UTC avoids silently presenting a national warning in the reader's local zone. */
export function visualTime(raw: string): string {
  return new Date(raw).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: 'UTC',
  }) + ' UTC';
}

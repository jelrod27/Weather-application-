import type { RSSItem } from '@/lib/services/rss/rssAggregator';
import { isActiveTropicalHeadline, isDiscoveryHeadline } from '@/lib/news/tropical-headlines';
import { isInConus } from '@/lib/geo/point-in-polygon';

export interface HubUserLocation {
  lat: number;
  lon: number;
  locationLabel: string;
  country: string;
}

export const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP',
]);

/** State abbreviations that collide with common English words when matched with \\b. */
const AMBIGUOUS_STATE_CODES = new Set(['OR', 'IN', 'ME', 'OK', 'HI', 'AS']);

export function parseUsStateCode(locationLabel: string): string | null {
  const match = locationLabel.match(/,\s*([A-Z]{2})\b/);
  const code = match?.[1];
  return code && US_STATE_CODES.has(code) ? code : null;
}

export function parseCityName(locationLabel: string): string | null {
  const city = locationLabel.split(',')[0]?.trim();
  return city && city.length > 2 ? city : null;
}

function haystack(item: Pick<RSSItem, 'title' | 'description' | 'location'>): string {
  return `${item.title} ${item.description ?? ''} ${item.location ?? ''}`.toLowerCase();
}

export function isGeographicallyRelatedToUser(
  text: string,
  user: HubUserLocation,
): boolean {
  const state = parseUsStateCode(user.locationLabel);
  if (state) {
    const stateLower = state.toLowerCase();
    const commaStateRe = new RegExp(`,\\s*${stateLower}(?:\\s|,|$)`);
    if (commaStateRe.test(text)) return true;
    if (!AMBIGUOUS_STATE_CODES.has(state)) {
      const tokenStateRe = new RegExp(`(?:^|\\s)${stateLower}(?:\\s|,|$)`);
      if (tokenStateRe.test(text)) return true;
    }
  }

  const city = parseCityName(user.locationLabel);
  if (city && city.length > 3) {
    const cityRe = new RegExp(`\\b${escapeRegExp(city)}\\b`, 'i');
    if (cityRe.test(text)) return true;
  }

  const country = user.country.trim().toLowerCase();
  if (country === 'us' || country === 'usa' || country === 'united states') {
    if (/\b(united states|u\.s\.|usa)\b/i.test(text)) return true;
  } else if (country.length >= 4) {
    const countryRe = new RegExp(`\\b${escapeRegExp(country)}\\b`, 'i');
    if (countryRe.test(text)) return true;
  }

  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isHeadlineRelevantToUser(item: RSSItem, user: HubUserLocation): boolean {
  if (!isDiscoveryHeadline(item)) return false;

  const text = haystack(item);

  switch (item.category) {
    case 'earthquakes': {
      const magnitude = item.magnitude ?? 0;
      if (magnitude >= 6) return true;
      if (magnitude >= 5) return isGeographicallyRelatedToUser(text, user);
      return false;
    }
    case 'severe':
      return isGeographicallyRelatedToUser(text, user);
    case 'hurricanes':
      return (
        isActiveTropicalHeadline(item) && isGeographicallyRelatedToUser(text, user)
      );
    case 'volcanoes':
      return item.priority === 'high' && isGeographicallyRelatedToUser(text, user);
    case 'space':
      return item.priority === 'high';
    default:
      return false;
  }
}

export function pickHeadlineForUser(
  happeningNow: RSSItem[],
  user: HubUserLocation,
): RSSItem | null {
  return happeningNow.find((item) => isHeadlineRelevantToUser(item, user)) ?? null;
}

/** Stargazer chip: show whenever we have a score for the user's area. */
export function shouldShowStargazerCard(stargazer: {
  score: number | null;
  needsLocation: boolean;
  loading: boolean;
}): boolean {
  if (stargazer.needsLocation || stargazer.loading || stargazer.score == null) return false;
  return true;
}

export function isSpcOutlookRegion(user: HubUserLocation): boolean {
  return isInConus(user.lat, user.lon);
}

export function stargazerCardDetail(stargazer: {
  score: number | null;
  label: string | null;
  summary: string | null;
}): string | undefined {
  if (stargazer.score == null) return undefined;
  if (stargazer.score >= 65) return stargazer.label ?? 'Good viewing tonight';
  if (stargazer.score <= 35) return stargazer.summary ?? stargazer.label ?? 'Poor tonight';
  return stargazer.summary ?? stargazer.label ?? 'Fair conditions tonight';
}

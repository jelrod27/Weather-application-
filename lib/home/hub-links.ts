import { safeExternalUrl } from '@/lib/safe-url';
import type { FeedCategory } from '@/lib/services/rss/feedSources';
import type { HubUserLocation } from '@/lib/home/hub-utils';

export function getHubStargazerHref(location: HubUserLocation | null | undefined): string {
  if (!location) return '/stargazer';
  const params = new URLSearchParams({
    lat: String(location.lat),
    lon: String(location.lon),
  });
  const label = location.locationLabel?.trim();
  if (label) params.set('q', label);
  return `/stargazer?${params.toString()}`;
}

export function getHubAlertsHref(topAlertId: string | null | undefined): string {
  if (!topAlertId) return '/warnings';
  return `/warnings?alert=${encodeURIComponent(topAlertId)}`;
}

export function getHubHeadlineHref(headline: {
  url: string | null | undefined;
  category: FeedCategory | null | undefined;
}): string {
  const safe = headline.url ? safeExternalUrl(headline.url) : null;
  if (safe) return safe;
  if (headline.category === 'severe') return '/warnings';
  return '/news';
}

export function isExternalHubHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://');
}

/** Match an NWS alert id from a warnings URL query param. */
export function findAlertByQueryParam(
  alerts: Array<{ id: string }>,
  alertParam: string | null | undefined,
): string | null {
  if (!alertParam || alerts.length === 0) return null;
  const decoded = (() => {
    try {
      return decodeURIComponent(alertParam);
    } catch {
      return alertParam;
    }
  })();

  const exact = alerts.find((a) => a.id === decoded || a.id === alertParam);
  if (exact) return exact.id;

  const suffix = alerts.find(
    (a) => a.id.endsWith(decoded) || decoded.endsWith(a.id) || a.id.includes(decoded),
  );
  return suffix?.id ?? null;
}

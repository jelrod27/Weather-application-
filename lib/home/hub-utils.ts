import type { FeedCategory } from '@/lib/services/rss/feedSources';
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';
import {
  pickHeadlineForUser,
  shouldShowStargazerCard,
  type HubUserLocation,
} from '@/lib/home/hub-location';
import { compareWarningPriority } from '@/lib/warnings/local-ranking';

/** SPC categorical risk levels worth surfacing on the home hub (Slight or higher). */
export const ELEVATED_SPC_RISK_CODES = new Set(['SLGT', 'ENH', 'MDT', 'HIGH']);

export function formatUpdatedAgo(date: Date): string {
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function pickHappeningNowHeadline(
  happeningNow: RSSItem[],
  user: HubUserLocation,
): RSSItem | null {
  return pickHeadlineForUser(happeningNow, user);
}

export function shouldShowHubAlerts(
  alerts: { count: number | null; needsLocation: boolean; loading: boolean },
): boolean {
  if (alerts.needsLocation || alerts.loading) return false;
  return true;
}

export function shouldShowSpcOutlook(
  riskCode: string | null,
  loading: boolean,
  inRegion: boolean,
): boolean {
  if (!inRegion || loading || !riskCode) return false;
  return ELEVATED_SPC_RISK_CODES.has(riskCode);
}

export function shouldShowHubHeadline(headline: {
  title: string | null;
  loading: boolean;
}): boolean {
  if (headline.loading || !headline.title) return false;
  return true;
}

export { shouldShowStargazerCard };

export function summarizeAlerts(alerts: NWSAlertDetail[]): {
  count: number;
  headline: string;
  severity: NWSAlertDetail['severity'] | null;
  topAlertId: string | null;
} {
  if (alerts.length === 0) {
    return { count: 0, headline: 'No active alerts for this pin', severity: null, topAlertId: null };
  }

  const sorted = [...alerts].sort(compareWarningPriority);

  const top = sorted[0];
  const headline =
    top.headline?.trim() ||
    top.event?.trim() ||
    `${alerts.length} active alert${alerts.length === 1 ? '' : 's'}`;

  return {
    count: alerts.length,
    headline,
    severity: top.severity,
    topAlertId: top.id || null,
  };
}

export function truncateText(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trim()}…`;
}

export type { HubUserLocation };

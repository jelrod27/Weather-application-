'use client';

import { useCallback, useEffect, useState } from 'react';
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';
import type { StargazerScore } from '@/lib/stargazer/types';
import {
  formatUpdatedAgo,
  pickHappeningNowHeadline,
  summarizeAlerts,
  truncateText,
  type HubUserLocation,
} from '@/lib/home/hub-utils';
import { isSpcOutlookRegion } from '@/lib/home/hub-location';

export interface HomeHubCoordinates {
  lat: number;
  lon: number;
}

export interface LocalSpcOutlook {
  label: string | null;
  fill: string;
  riskCode: string | null;
  loading: boolean;
  inRegion: boolean;
}

export interface HomeHubData {
  spc: LocalSpcOutlook;
  alerts: {
    loading: boolean;
    count: number | null;
    headline: string;
    severity: NWSAlertDetail['severity'] | null;
    topAlertId: string | null;
    needsLocation: boolean;
  };
  stargazer: {
    loading: boolean;
    score: number | null;
    label: string | null;
    summary: string | null;
    needsLocation: boolean;
  };
  headline: {
    loading: boolean;
    title: string | null;
    category: RSSItem['category'] | null;
    description: string | null;
    priority: RSSItem['priority'] | null;
    url: string | null;
    id: string | null;
    lastUpdated: Date | null;
    lastUpdatedLabel: string | null;
  };
  loading: boolean;
}

const SEVERITY_ACCENT: Record<string, string> = {
  Extreme: '#ef4444',
  Severe: '#f97316',
  Moderate: '#eab308',
  Minor: '#3b82f6',
};

function hydrateNewsItems(items: RSSItem[]): RSSItem[] {
  return items.map((item) => ({
    ...item,
    timestamp: new Date(item.timestamp),
  }));
}

export function useHomeHubData(userLocation?: HubUserLocation | null): HomeHubData {
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertSummary, setAlertSummary] = useState<ReturnType<typeof summarizeAlerts>>({
    count: 0,
    headline: 'No active alerts nearby',
    severity: null,
    topAlertId: null,
  });

  const [spcLoading, setSpcLoading] = useState(false);
  const [localSpc, setLocalSpc] = useState<Omit<LocalSpcOutlook, 'loading' | 'inRegion'>>({
    label: null,
    fill: '#64748b',
    riskCode: null,
  });

  const [stargazerLoading, setStargazerLoading] = useState(false);
  const [stargazerScore, setStargazerScore] = useState<StargazerScore | null>(null);

  const [headlineLoading, setHeadlineLoading] = useState(false);
  const [headlineItem, setHeadlineItem] = useState<RSSItem | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadLocationData = useCallback(
    async (user: HubUserLocation, signal?: AbortSignal) => {
      setAlertsLoading(true);
      setStargazerLoading(true);
      setHeadlineLoading(true);
      if (isSpcOutlookRegion(user)) setSpcLoading(true);

      const point = `${user.lat},${user.lon}`;
      const requests: Promise<void>[] = [];

      requests.push(
        fetch(`/api/weather/alerts?detail=1&point=${encodeURIComponent(point)}`, { signal })
          .then(async (alertsRes) => {
            if (signal?.aborted) return;
            try {
              if (alertsRes.ok) {
                const data = (await alertsRes.json()) as { alerts?: NWSAlertDetail[] };
                setAlertSummary(summarizeAlerts(data.alerts ?? []));
              } else {
                setAlertSummary({ count: 0, headline: 'Alerts unavailable', severity: null, topAlertId: null });
              }
            } catch {
              setAlertSummary({ count: 0, headline: 'Alerts unavailable', severity: null, topAlertId: null });
            } finally {
              if (!signal?.aborted) setAlertsLoading(false);
            }
          }),
      );

      requests.push(
        fetch(`/api/stargazer?lat=${user.lat}&lon=${user.lon}`, { signal })
          .then(async (stargazerRes) => {
            if (signal?.aborted) return;
            try {
              if (stargazerRes.ok) {
                const data = (await stargazerRes.json()) as { score?: StargazerScore };
                setStargazerScore(data.score ?? null);
              } else {
                setStargazerScore(null);
              }
            } catch {
              setStargazerScore(null);
            } finally {
              if (!signal?.aborted) setStargazerLoading(false);
            }
          }),
      );

      requests.push(
        fetch('/api/news/rss?maxItems=30&maxAge=72', { signal })
          .then(async (newsRes) => {
            if (signal?.aborted) return;
            try {
              if (!newsRes.ok) throw new Error('news');
              const data = await newsRes.json();
              const happeningNow = Array.isArray(data.happeningNow)
                ? hydrateNewsItems(data.happeningNow)
                : [];
              setHeadlineItem(pickHappeningNowHeadline(happeningNow, user));
              setLastUpdated(data.lastUpdated ? new Date(data.lastUpdated) : new Date());
            } catch {
              setHeadlineItem(null);
              setLastUpdated(null);
            } finally {
              if (!signal?.aborted) setHeadlineLoading(false);
            }
          }),
      );

      if (isSpcOutlookRegion(user)) {
        requests.push(
          fetch(
            `/api/weather/spc-outlook?day=1&type=cat&point=${encodeURIComponent(point)}`,
            { signal },
          ).then(async (spcRes) => {
            if (signal?.aborted) return;
            try {
              if (spcRes.ok) {
                const data = (await spcRes.json()) as {
                  pointRisk?: { riskCode: string; label: string; fill: string } | null;
                };
                const risk = data.pointRisk ?? null;
                setLocalSpc({
                  label: risk?.label ?? null,
                  fill: risk?.fill ?? '#64748b',
                  riskCode: risk?.riskCode ?? null,
                });
              } else {
                setLocalSpc({ label: null, fill: '#64748b', riskCode: null });
              }
            } catch {
              setLocalSpc({ label: null, fill: '#64748b', riskCode: null });
            } finally {
              if (!signal?.aborted) setSpcLoading(false);
            }
          }),
        );
      } else {
        setLocalSpc({ label: null, fill: '#64748b', riskCode: null });
        setSpcLoading(false);
      }

      await Promise.all(requests);
    },
    [],
  );

  useEffect(() => {
    if (!userLocation) {
      setAlertSummary({
        count: 0,
        headline: 'Press START or search for local alerts',
        severity: null,
        topAlertId: null,
      });
      setStargazerScore(null);
      setHeadlineItem(null);
      setLastUpdated(null);
      setLocalSpc({ label: null, fill: '#64748b', riskCode: null });
      setAlertsLoading(false);
      setStargazerLoading(false);
      setHeadlineLoading(false);
      setSpcLoading(false);
      return;
    }

    const controller = new AbortController();
    void loadLocationData(userLocation, controller.signal);
    const timer = setInterval(
      () => void loadLocationData(userLocation, controller.signal),
      10 * 60 * 1000,
    );
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [userLocation?.lat, userLocation?.lon, userLocation?.locationLabel, loadLocationData]);

  const needsLocation = !userLocation;
  const inRegion = userLocation ? isSpcOutlookRegion(userLocation) : false;
  const loading =
    !needsLocation &&
    (alertsLoading || stargazerLoading || headlineLoading || (inRegion && spcLoading));

  return {
    loading,
    spc: {
      ...localSpc,
      loading: inRegion && spcLoading,
      inRegion,
    },
    alerts: {
      loading: alertsLoading,
      count: needsLocation ? null : alertSummary.count,
      headline: alertSummary.headline,
      severity: alertSummary.severity,
      topAlertId: needsLocation ? null : alertSummary.topAlertId,
      needsLocation,
    },
    stargazer: {
      loading: stargazerLoading,
      score: stargazerScore?.overall ?? null,
      label: stargazerScore?.label ?? null,
      summary: stargazerScore?.summary ?? null,
      needsLocation,
    },
    headline: {
      loading: headlineLoading,
      title: headlineItem?.title ?? null,
      category: headlineItem?.category ?? null,
      description: headlineItem?.description ?? null,
      priority: headlineItem?.priority ?? null,
      url: headlineItem?.url ?? null,
      id: headlineItem?.id ?? null,
      lastUpdated,
      lastUpdatedLabel: lastUpdated ? formatUpdatedAgo(lastUpdated) : null,
    },
  };
}

export function getAlertsCardValue(data: HomeHubData['alerts']): string {
  if (data.count === 0) return 'All clear';
  return `${data.count} near you`;
}

export function getStargazerCardValue(data: HomeHubData['stargazer']): string {
  if (data.score == null) return 'Unavailable';
  return `${Math.round(data.score)} · ${data.label ?? 'Tonight'}`;
}

export function getHeadlineCardValue(data: HomeHubData['headline']): string {
  if (!data.title) return '';
  return truncateText(data.title, 48);
}

export { SEVERITY_ACCENT, truncateText };
export type { HubUserLocation } from '@/lib/home/hub-utils';

'use client';

import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import { getCategoryConfig } from '@/components/news/CategoryBadge';
import HomeHubCard from '@/components/home/home-hub-card';
import HappeningNowCard from '@/components/home/happening-now-card';
import { stargazerCardDetail } from '@/lib/home/hub-location';
import {
  shouldShowHubAlerts,
  shouldShowHubHeadline,
  shouldShowSpcOutlook,
  shouldShowStargazerCard,
} from '@/lib/home/hub-utils';
import type { HubUserLocation } from '@/lib/home/hub-utils';
import {
  getHeadlineCardValue,
  getStargazerCardValue,
  SEVERITY_ACCENT,
  useHomeHubData,
} from '@/hooks/use-home-hub-data';
import { getHubHeadlineHref, getHubStargazerHref } from '@/lib/home/hub-links';

export interface HomeHubProps {
  userLocation?: HubUserLocation | null;
  className?: string;
}

function stargazerAccent(score: number | null): string {
  if (score == null) return '#64748b';
  if (score >= 80) return '#34d399';
  if (score >= 60) return '#4ade80';
  if (score >= 40) return '#facc15';
  if (score >= 20) return '#fb923c';
  return '#f87171';
}

export default function HomeHub({ userLocation, className }: HomeHubProps) {
  const themeClasses = themeTokens.weather;
  const data = useHomeHubData(userLocation);

  if (!userLocation) return null;

  const showAlerts = shouldShowHubAlerts(data.alerts);
  const showSpc = shouldShowSpcOutlook(data.spc.riskCode, data.spc.loading, data.spc.inRegion);
  const showHeadline = shouldShowHubHeadline(data.headline);
  const showStargazer = shouldShowStargazerCard(data.stargazer);
  const hasVisibleCard = showAlerts || showSpc || showHeadline || showStargazer;

  if (data.loading && !hasVisibleCard) {
    return (
      <section
        data-testid="home-hub"
        aria-label="Alerts for your area"
        className={cn('mt-4 mb-4', className)}
      >
        <div className="mb-2">
          <h2 className={cn('text-sm font-bold font-mono', themeClasses.headerText)}>
            FOR YOUR AREA
          </h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          <div className="h-16 min-w-[140px] animate-pulse rounded-md bg-gray-800/40" aria-hidden />
          <div className="h-16 min-w-[140px] animate-pulse rounded-md bg-gray-800/40" aria-hidden />
        </div>
      </section>
    );
  }

  if (!data.loading && !hasVisibleCard) {
    return null;
  }

  const headlineCategory = data.headline.category
    ? getCategoryConfig(data.headline.category)
    : null;

  const alertsAccent =
    data.alerts.severity != null
      ? (SEVERITY_ACCENT[data.alerts.severity] ?? '#64748b')
      : '#64748b';

  return (
    <section
      data-testid="home-hub"
      aria-label="Alerts for your area"
      className={cn('mt-4 mb-4', className)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2
          className={cn(
            'text-sm font-bold font-mono flex items-center gap-1.5',
            themeClasses.headerText,
          )}
        >
          <span
            className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse news-live-dot"
            aria-hidden
          />
          FOR YOUR AREA
        </h2>
        {data.headline.lastUpdatedLabel ? (
          <p className={cn('text-[10px] font-mono opacity-60', themeClasses.text)}>
            {data.headline.lastUpdatedLabel}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {showAlerts ? (
          <HappeningNowCard
            count={data.alerts.count}
            headline={data.alerts.headline}
            severity={data.alerts.severity}
            topAlertId={data.alerts.topAlertId}
            nearbyCount={data.alerts.nearbyCount}
            nearbyTopId={data.alerts.nearbyTopId}
            accentColor={alertsAccent}
            loading={data.alerts.loading}
          />
        ) : null}

        {showSpc ? (
          <HomeHubCard
            title="Storms near you"
            value={`${data.spc.label ?? 'Elevated'} risk today`}
            detail="Severe weather outlook"
            href="/severe"
            accentColor={data.spc.fill}
          />
        ) : null}

        {showHeadline ? (
          <HomeHubCard
            title={headlineCategory ? headlineCategory.label : 'Breaking'}
            value={getHeadlineCardValue(data.headline)}
            href={getHubHeadlineHref(data.headline)}
            accentColor="var(--primary)"
          />
        ) : null}

        {showStargazer ? (
          <HomeHubCard
            title="Tonight's sky"
            value={getStargazerCardValue(data.stargazer)}
            detail={stargazerCardDetail(data.stargazer)}
            href={getHubStargazerHref(userLocation)}
            accentColor={stargazerAccent(data.stargazer.score)}
            loading={data.stargazer.loading}
          />
        ) : null}
      </div>
    </section>
  );
}

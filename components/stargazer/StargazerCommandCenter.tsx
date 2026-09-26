'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Moon } from 'lucide-react';
import SkyLessons from '@/components/stargazer/SkyLessons';
import BeginnerPanel from '@/components/stargazer/BeginnerPanel';
import { formatDate, formatTime, nextCalendarDate } from '@/lib/stargazer/format';
import { ShareButtons } from '@/components/share-buttons';
import { getStargazerHref, readStargazerContext } from '@/lib/stargazer/context';
import type { StargazerContext } from '@/lib/stargazer/context';
import { cn } from '@/lib/utils';
import type { StargazerData } from '@/lib/stargazer/types';
import { getSubScoreLabel } from '@/lib/stargazer/score';
import ForecastFreshness from '@/components/stargazer/ForecastFreshness';
import StargazerNav from '@/components/stargazer/StargazerNav';
import FullHourlyTimeline from '@/components/stargazer/HourlyTimeline';
import MoonIntel from '@/components/stargazer/MoonIntel';
import PlanetTable from '@/components/stargazer/PlanetTable';
import DeepSkyHighlights from '@/components/stargazer/DeepSkyHighlights';
import SkyEvents from '@/components/stargazer/SkyEvents';
import ISSPasses from '@/components/stargazer/ISSPasses';
import LaunchSchedule from '@/components/stargazer/LaunchSchedule';
import StargazerAttribution from '@/components/stargazer/StargazerAttribution';
import { useStargazerUnits } from '@/hooks/useStargazerUnits';
import { useStargazerController } from '@/hooks/useStargazerController';

// ============================================================================
// Score color helpers
// ============================================================================

function scoreColor(score: number | null): string {
  return score === null ? 'text-muted-foreground' : 'text-primary';
}

function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-400';
  if (score >= 60) return 'bg-green-400';
  if (score >= 40) return 'bg-yellow-400';
  if (score >= 20) return 'bg-orange-400';
  return 'bg-red-400';
}

// ============================================================================
// Loading skeleton
// ============================================================================

function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="container-primary p-4 animate-pulse">
      <div className="h-5 w-1/3 bg-white/10 rounded mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 w-full bg-white/10 rounded mb-2" />
      ))}
    </div>
  );
}

// ============================================================================
// Persistent Header Card
// ============================================================================

function PhotographySummary({ data }: { data: StargazerData }) {
  const { score, bestWindow, nightAverage, limitingFactor, darkWindow, moon, location } = data;

  return (
    <div className="container-primary p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Left: Moon phase icon area */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="w-24 h-24 rounded-full border border-border bg-muted/50 flex flex-col items-center justify-center gap-1">
            <Moon aria-hidden="true" className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold">{Math.round(moon.illumination)}%</span>
          </div>
          <span className="mt-2 text-xs font-mono uppercase text-muted-foreground">
            {moon.phaseName}
          </span>
        </div>

        {/* Right: Score, label, summary, times */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono uppercase text-muted-foreground">Photography conditions /100</p>
          <div className="flex items-baseline gap-3 mb-1">
            <span className={cn('text-4xl sm:text-5xl font-extrabold font-mono tabular-nums', scoreColor(score.overall))}>
              {score.overall === null ? '--' : Math.round(score.overall)}
            </span>
            <span className={cn('text-xl font-bold font-mono uppercase', scoreColor(score.overall))}>
              {score.label}
            </span>
            {nightAverage != null && nightAverage !== score.overall && (
              <span className="text-sm font-mono text-muted-foreground ml-1">
                (available night avg: {nightAverage}/100)
              </span>
            )}
          </div>

          {/* Best window callout */}
          {bestWindow && (
            <div className="mb-2 px-3 py-1.5 bg-white/5 border border-subtle rounded inline-flex items-center gap-2 text-sm font-mono">
              <span className="text-muted-foreground">Highest-rated photography period:</span>
              <span className="font-bold">
                {formatTime(bestWindow.startTime, data.location.timezone, true)} &ndash; {formatTime(bestWindow.endTime, data.location.timezone, true)}
              </span>
              <span className={cn('font-bold', scoreColor(bestWindow.score))}>
                ({bestWindow.score}/100)
              </span>
            </div>
          )}

          {/* Limiting factor */}
          {limitingFactor && (
            <p className="text-xs font-mono text-foreground mb-2">
              Limiting factor: <span className="capitalize">{limitingFactor.category}</span> &mdash; {limitingFactor.label.toLowerCase()}{limitingFactor.detail ? ` (${limitingFactor.detail})` : ''}
            </p>
          )}

          {(location.displayName || location.name) && (
            <div className="text-xs font-mono text-muted-foreground mb-2 space-y-0.5">
              <p className="text-sm font-bold text-foreground">
                {location.displayName || location.name}
              </p>
              <p>
                {Math.abs(location.lat).toFixed(2)}{'\u00B0'}{location.lat >= 0 ? 'N' : 'S'},{' '}
                {Math.abs(location.lon).toFixed(2)}{'\u00B0'}{location.lon >= 0 ? 'E' : 'W'}
                {location.bortle != null && (
                  <span className="ml-3" title={location.bortleLabel || ''}>
                    Bortle {location.bortle} (population estimate, not measured)
                  </span>
                )}
              </p>
            </div>
          )}

          <p className="text-sm font-mono text-muted-foreground mb-3 max-w-xl">
            {score.summary}
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-mono mb-4">
            {darkWindow && (
              <div>
                <span className="text-xs font-mono uppercase text-muted-foreground block">Dark Window</span>
                <span className="font-bold">
                  {darkWindow.status === 'none' ? 'No astronomical darkness' : darkWindow.status === 'continuous' ? 'Continuous darkness (next 24 hours)' : <>{formatTime(darkWindow.astronomicalDusk, data.location.timezone, true)} &ndash; {formatTime(darkWindow.astronomicalDawn, data.location.timezone, true)}</>}
                </span>
              </div>
            )}
            {moon.set && (
              <div>
                <span className="text-xs font-mono uppercase text-muted-foreground block">Moon Set</span>
                <span className="font-bold">{formatTime(moon.set, data.location.timezone, true)}</span>
              </div>
            )}
          </div>

          <p className="text-xs font-mono text-muted-foreground mb-3">Times in {location.timezone || 'UTC'}</p>

          {/* Sub-score mini-bars with visible labels */}
          {score.subScores && <div className="grid grid-cols-5 gap-2 max-w-lg text-xs font-mono">
            {Object.entries(score.subScores).map(([key, val]) => {
              const label = getSubScoreLabel(key, val);
              return (
                <div key={key} className="flex flex-col items-center gap-1" title={label}>
                  <span className="text-xs font-mono uppercase text-muted-foreground">{key}</span>
                  <div className="w-full h-2 bg-white/10 rounded overflow-hidden">
                    <div
                      className={cn('h-full rounded', scoreBarColor(val))}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                  <span className="font-bold font-mono">{Math.round(val)}/100</span>
                  <span className="text-[10px] font-mono text-muted-foreground text-center leading-tight truncate w-full">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tab Content Panels
// ============================================================================

function ConditionsPanel({ data }: { data: StargazerData }) {
  const units = useStargazerUnits();
  const { hourlyConditions, bestWindow, darkWindow, moon } = data;

  // Rehydrate dates from JSON serialization
  const conditions = hourlyConditions?.map((h) => ({
    ...h,
    time: typeof h.time === 'string' ? new Date(h.time) : h.time,
  })) ?? [];

  const rehydratedDarkWindow = darkWindow ? {
    status: darkWindow.status,
    sunset: typeof darkWindow.sunset === 'string' ? new Date(darkWindow.sunset) : darkWindow.sunset,
    sunrise: typeof darkWindow.sunrise === 'string' ? new Date(darkWindow.sunrise) : darkWindow.sunrise,
    astronomicalDusk: typeof darkWindow.astronomicalDusk === 'string' ? new Date(darkWindow.astronomicalDusk) : darkWindow.astronomicalDusk,
    astronomicalDawn: typeof darkWindow.astronomicalDawn === 'string' ? new Date(darkWindow.astronomicalDawn) : darkWindow.astronomicalDawn,
  } : undefined;

  // Use best-window midpoint for ground conditions, fallback to dark window midpoint
  const groundConditions = (() => {
    if (conditions.length === 0) return null;

    let targetMs: number;
    if (bestWindow?.startTime && bestWindow?.endTime) {
      const start = typeof bestWindow.startTime === 'string' ? new Date(bestWindow.startTime) : bestWindow.startTime;
      const end = typeof bestWindow.endTime === 'string' ? new Date(bestWindow.endTime) : bestWindow.endTime;
      targetMs = (start.getTime() + end.getTime()) / 2;
    } else if (rehydratedDarkWindow) {
      targetMs = (rehydratedDarkWindow.astronomicalDusk.getTime() + rehydratedDarkWindow.astronomicalDawn.getTime()) / 2;
    } else {
      return conditions[Math.floor(conditions.length / 2)];
    }

    // Find the hour closest to the target midpoint
    let closest = conditions[0];
    let minDiff = Infinity;
    for (const c of conditions) {
      const diff = Math.abs(c.time.getTime() - targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        closest = c;
      }
    }
    return closest;
  })();

  return (
    <div className="space-y-6">
      {rehydratedDarkWindow && (
        <FullHourlyTimeline timeZone={data.location.timezone} conditions={conditions} darkWindow={rehydratedDarkWindow} />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MoonIntel timeZone={data.location.timezone} moon={moon} />
        {/* Ground conditions summary */}
        <div className="container-primary p-4 font-mono">
          <h2 className="border-b border-subtle py-3 mb-3 text-xs font-mono uppercase text-muted-foreground">
            Ground Conditions
            <span className="text-muted-foreground font-normal ml-2">
              (at {groundConditions ? formatTime(groundConditions.time, data.location.timezone, true) : '--:--'})
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {groundConditions && (
              <>
                <div>
                  <span className="text-xs font-mono uppercase text-muted-foreground block">Temperature</span>
                  <span className="text-xl font-bold font-mono">{units.temperature(groundConditions.temperature)}</span>
                </div>
                <div>
                  <span className="text-xs font-mono uppercase text-muted-foreground block">Humidity</span>
                  <span className="text-xl font-bold font-mono">{groundConditions.humidity == null ? 'Unavailable' : `${Math.round(groundConditions.humidity)}%`}</span>
                </div>
                <div>
                  <span className="text-xs font-mono uppercase text-muted-foreground block">Wind Speed</span>
                  <span className="text-xl font-bold font-mono">{units.wind(groundConditions.windSpeed)}</span>
                </div>
                <div>
                  <span className="text-xs font-mono uppercase text-muted-foreground block">Cloud Cover</span>
                  <span className="text-xl font-bold font-mono">{groundConditions.cloudCover == null ? 'Unavailable' : `${Math.round(groundConditions.cloudCover)}%`}</span>
                </div>
                <div>
                  <span className="text-xs font-mono uppercase text-muted-foreground block">Dew Risk</span>
                  <span className="text-xl font-bold font-mono capitalize">{groundConditions.dewRisk ?? 'Unavailable'}</span>
                </div>
                <div>
                  <span className="text-xs font-mono uppercase text-muted-foreground block">Seeing</span>
                  <span className="text-xl font-bold font-mono">{groundConditions.seeing == null ? 'Unavailable' : `${groundConditions.seeing}/8`}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TargetsPanel({ data, context }: { data: StargazerData; context: StargazerContext }) {
  return (
    <div className="space-y-6">
      <PlanetTable timeZone={data.location.timezone} planets={data.planets} />
      <DeepSkyHighlights context={context} timeZone={data.location.timezone} highlights={data.deepSkyHighlights} />
    </div>
  );
}

function EventsPanel({ data }: { data: StargazerData }) {
  // Merge meteor shower events with sky events so they appear in the timeline
  const meteorShowerEvents = (data.meteorShowers ?? []).map(s => {
    const calendarDate = nextCalendarDate(s.peakMonth, s.peakDay, data.location.timezone, new Date(data.generatedAt));
    return {
    date: new Date(`${calendarDate}T00:00:00Z`),
    calendarDate,
    type: 'meteor_shower' as const,
    title: `${s.name} Meteor Shower Peak`,
    description: `ZHR: ${s.zhr} | Speed: ${s.speed} km/s | Parent: ${s.parentBody}`,
    moonInterference: s.moonInterference === 'none' ? undefined : `Moon: ${s.moonIlluminationAtPeak}% illuminated`,
  };
  });
  const combinedEvents = [...(data.skyEvents ?? []), ...meteorShowerEvents]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <SkyEvents timeZone={data.location.timezone} events={combinedEvents} />
      <ISSPasses timeZone={data.location.timezone} passes={data.issPasses} />
    </div>
  );
}

function LaunchesPanel({ data }: { data: StargazerData }) {
  return (
    <LaunchSchedule timeZone={data.location.timezone} launches={data.launches} />
  );
}

export default function StargazerCommandCenter() {
  const {
    data,
    receivedAt,
    invalidSharedTime,
    acknowledgeSharedTime,
    isLoading,
    error,
    activeTab,
    searchQuery,
    setSearchQuery,
    isSearching,
    handleTabChange,
    handleLocationSearch,
    handleDeviceLocation,
    refresh,
  } = useStargazerController();
  const [, setClockTick] = useState(0);
  const now = Date.now();
  useEffect(() => {
    const update = () => setClockTick(tick => tick + 1);
    const timer = window.setInterval(update, 60000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  const urlContext = readStargazerContext(new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search));
  const context: StargazerContext = {
    ...urlContext,
    invalidTime: urlContext.invalidTime || invalidSharedTime,
    coordinates: data?.location ?? null,
    label: data?.location.displayName || data?.location.name || urlContext.label,
    timeZone: data?.location.timezone,
  };

  const changeObservingContext = (change: Pick<StargazerContext, 'at' | 'equipment'>): void => {
    window.history.replaceState(null, '', getStargazerHref({ ...context, ...change, from: 'start' }) + window.location.hash);
    acknowledgeSharedTime();
  };

  return (
    <>
        {/* Location Search */}
        <form onSubmit={handleLocationSearch} className="mb-4 flex gap-2 max-w-lg">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Stargazer location search"
            data-testid="stargazer-location-search"
            placeholder="Search location (city, state)"
            className="flex-1 px-3 py-2 text-sm font-mono min-w-0 bg-background border border-border rounded focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            data-testid="stargazer-location-go"
            className="px-4 py-2 text-sm font-mono font-bold border border-subtle rounded hover:bg-white/10 disabled:opacity-40 transition-colors"
          >
            {isSearching ? '...' : 'Go'}
          </button>
        </form>
        <div className="mb-4 flex gap-4 text-sm">
          <button type="button" className="text-primary underline" onClick={() => void handleDeviceLocation()} disabled={isLoading}>Use my location</button>
          {(data || error) && <button type="button" className="text-primary underline" onClick={() => void refresh()} disabled={isLoading}>Refresh forecast</button>}
        </div>
        {!data && !isLoading && !error && <p className="mb-4">Choose a city to see its night sky forecast.</p>}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 container-primary border-red-500/40 font-mono text-sm text-foreground">
            {error}
          </div>
        )}

        {!data && !isLoading && <div className="flex flex-wrap gap-4 mb-5 text-sm">
          <Link href="/stargazer/objects" className="text-primary underline">Explore the object catalog</Link>
          <a href="https://science.nasa.gov/skywatching/faq/" className="text-primary underline">Learn to look at the night sky</a>
        </div>}

        {!data && !isLoading && <SkyLessons />}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            <SkeletonCard rows={5} />
            <SkeletonCard rows={2} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonCard rows={4} />
              <SkeletonCard rows={4} />
            </div>
          </div>
        )}

        {/* Content */}
        {data && !isLoading && (
          <div className="space-y-6">
            <p className="font-semibold">Observing place: {context.label || `${data.location.lat.toFixed(2)}, ${data.location.lon.toFixed(2)}`}</p>
            <p className="text-sm">Observing night: {formatDate(data.darkWindow.sunset ?? data.darkWindow.astronomicalDusk, data.location.timezone, true)} – {formatDate(data.darkWindow.sunrise ?? data.darkWindow.astronomicalDawn, data.location.timezone, true)} · {data.location.timezone || 'UTC'}</p>
            <ForecastFreshness retrievedAt={data.weatherRetrievedAt} receivedAt={receivedAt} now={now} timeZone={data.location.timezone} />
            <ShareButtons config={{ title: 'Stargazer', text: 'Explore the night sky', url: `https://www.16bitweather.co${getStargazerHref(context)}` }} />

            {/* Tab Navigation */}
            <StargazerNav activeTab={activeTab} onTabChange={handleTabChange} />

            {/* Tab Content */}
            <div
              tabIndex={0}
              role="tabpanel"
              id={`panel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
            >
              {activeTab === 'start' && <BeginnerPanel key={`${data.location.lat},${data.location.lon}`} data={data} context={context} now={now} receivedAt={receivedAt} onContextChange={changeObservingContext} onTabChange={handleTabChange} />}
              {activeTab === 'conditions' && <div className="space-y-5"><PhotographySummary data={data} /><ConditionsPanel data={data} /></div>}
              {activeTab === 'targets' && <TargetsPanel data={data} context={context} />}
              {activeTab === 'events' && <EventsPanel data={data} />}
              {activeTab === 'launches' && <LaunchesPanel data={data} />}
            </div>

            {(['start', 'conditions', 'targets', 'events', 'launches'] as const).filter(tab => tab !== activeTab).map(tab => <div key={tab} id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} hidden />)}

            {/* Attribution */}
            <StargazerAttribution />
          </div>
        )}
    </>
  );
}

'use client';

/**
 * 16-Bit Weather Platform - Stargazer Command Center
 *
 * Tabbed command center layout for astrophotography forecasting.
 * Matches space weather page patterns with persistent header card,
 * tab navigation, and organized content sections.
 */

import React, { useEffect, useState, useCallback, startTransition, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import PageWrapper from '@/components/page-wrapper';
import { ShareButtons } from '@/components/share-buttons';
import { useLocationContext } from '@/components/location-context';
import type { StargazerData } from '@/lib/stargazer/types';
import { getSubScoreLabel } from '@/lib/stargazer/score';
import { formatTonightDate } from '@/lib/stargazer/bortle';
import StargazerNav, { type StargazerTabId } from '@/components/stargazer/StargazerNav';
import FullHourlyTimeline from '@/components/stargazer/HourlyTimeline';
import MoonIntel from '@/components/stargazer/MoonIntel';
import PlanetTable from '@/components/stargazer/PlanetTable';
import DeepSkyHighlights from '@/components/stargazer/DeepSkyHighlights';
import SkyEvents from '@/components/stargazer/SkyEvents';
import ISSPasses from '@/components/stargazer/ISSPasses';
import LaunchSchedule from '@/components/stargazer/LaunchSchedule';
import StargazerAttribution from '@/components/stargazer/StargazerAttribution';

// ============================================================================
// Score color helpers
// ============================================================================

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
}

function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-400';
  if (score >= 60) return 'bg-green-400';
  if (score >= 40) return 'bg-yellow-400';
  if (score >= 20) return 'bg-orange-400';
  return 'bg-red-400';
}

// Intentionally local: unlike the shared 24-hour formatTime in
// @/lib/stargazer/format, the page header uses 12-hour en-US time and
// accepts ISO strings.
function formatTime(date: Date | string | null): string {
  if (!date) return '--:--';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ============================================================================
// Tab hash helpers
// ============================================================================

const VALID_TABS: StargazerTabId[] = ['conditions', 'targets', 'events', 'launches'];

function getTabFromHash(): StargazerTabId {
  if (typeof window === 'undefined') return 'conditions';
  const hash = window.location.hash.replace('#', '') as StargazerTabId;
  return VALID_TABS.includes(hash) ? hash : 'conditions';
}

function parseCoord(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

async function geocodeLabel(label: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const geoRes = await fetch(`/api/weather/geocoding?q=${encodeURIComponent(label)}&limit=1`);
    if (!geoRes.ok) return null;
    const geoData = await geoRes.json();
    const result = Array.isArray(geoData) ? geoData[0] : geoData;
    if (result?.lat != null && result?.lon != null) {
      return { lat: result.lat, lon: result.lon };
    }
  } catch {
    return null;
  }
  return null;
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

function PersistentHeader({ data }: { data: StargazerData }) {
  const { score, bestWindow, nightAverage, limitingFactor, darkWindow, moon, location } = data;

  return (
    <div className="container-primary p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Left: Moon phase icon area */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="w-24 h-24 rounded-full border-2 border-subtle bg-black/30 flex items-center justify-center relative overflow-hidden">
            <div
              className="absolute inset-0 bg-white/80 rounded-full"
              style={{
                clipPath: `inset(0 ${100 - Math.round(moon.illumination)}% 0 0)`,
              }}
            />
            <span className="relative z-10 text-2xl font-bold font-mono text-white drop-shadow-lg">
              {Math.round(moon.illumination)}%
            </span>
          </div>
          <span className="mt-2 text-xs font-mono uppercase text-muted-foreground">
            {moon.phaseName}
          </span>
        </div>

        {/* Right: Score, label, summary, times */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 mb-1">
            <span className={cn('text-4xl sm:text-5xl font-extrabold font-mono tabular-nums', scoreColor(score.overall))}>
              {Math.round(score.overall)}
            </span>
            <span className={cn('text-xl font-bold font-mono uppercase', scoreColor(score.overall))}>
              {score.label}
            </span>
            {nightAverage != null && nightAverage !== score.overall && (
              <span className="text-sm font-mono text-muted-foreground ml-1">
                (night avg: {nightAverage})
              </span>
            )}
          </div>

          {/* Best window callout */}
          {bestWindow && (
            <div className="mb-2 px-3 py-1.5 bg-white/5 border border-subtle rounded inline-flex items-center gap-2 text-sm font-mono">
              <span className="text-muted-foreground">Best window:</span>
              <span className="font-bold">
                {formatTime(bestWindow.startTime)} &ndash; {formatTime(bestWindow.endTime)}
              </span>
              <span className={cn('font-bold', scoreColor(bestWindow.score))}>
                ({bestWindow.score})
              </span>
            </div>
          )}

          {/* Limiting factor */}
          {limitingFactor && (
            <p className="text-xs font-mono text-amber-400/90 mb-2">
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
                    Bortle {location.bortle} (est.)
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
                  {formatTime(darkWindow.astronomicalDusk)} &ndash; {formatTime(darkWindow.astronomicalDawn)}
                </span>
              </div>
            )}
            {moon.set && (
              <div>
                <span className="text-xs font-mono uppercase text-muted-foreground block">Moon Set</span>
                <span className="font-bold">{formatTime(moon.set)}</span>
              </div>
            )}
          </div>

          {/* Sub-score mini-bars with visible labels */}
          <div className="grid grid-cols-5 gap-2 max-w-lg text-xs font-mono">
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
                  <span className="font-bold font-mono">{Math.round(val)}</span>
                  <span className="text-[10px] font-mono text-muted-foreground text-center leading-tight truncate w-full">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tab Content Panels
// ============================================================================

function ConditionsPanel({ data }: { data: StargazerData }) {
  const { hourlyConditions, bestWindow, darkWindow, moon } = data;

  // Rehydrate dates from JSON serialization
  const conditions = hourlyConditions?.map((h) => ({
    ...h,
    time: typeof h.time === 'string' ? new Date(h.time) : h.time,
  })) ?? [];

  const rehydratedDarkWindow = darkWindow ? {
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
      {conditions.length > 0 && rehydratedDarkWindow && (
        <FullHourlyTimeline conditions={conditions} darkWindow={rehydratedDarkWindow} />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MoonIntel moon={moon} />
        {/* Ground conditions summary */}
        <div className="container-primary p-4 font-mono">
          <h2 className="border-b border-subtle py-3 mb-3 text-xs font-mono uppercase text-muted-foreground">
            Ground Conditions
            <span className="text-muted-foreground font-normal ml-2">
              (at {groundConditions ? formatTime(groundConditions.time) : '--:--'})
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {groundConditions && (
              <>
                <div>
                  <span className="text-xs font-mono uppercase text-muted-foreground block">Temperature</span>
                  <span className="text-xl font-bold font-mono">{Math.round(groundConditions.temperature)}&deg;C</span>
                </div>
                <div>
                  <span className="text-xs font-mono uppercase text-muted-foreground block">Humidity</span>
                  <span className="text-xl font-bold font-mono">{Math.round(groundConditions.humidity)}%</span>
                </div>
                <div>
                  <span className="text-xs font-mono uppercase text-muted-foreground block">Wind Speed</span>
                  <span className="text-xl font-bold font-mono">{Math.round(groundConditions.windSpeed)} km/h</span>
                </div>
                <div>
                  <span className="text-xs font-mono uppercase text-muted-foreground block">Cloud Cover</span>
                  <span className="text-xl font-bold font-mono">{Math.round(groundConditions.cloudCover)}%</span>
                </div>
                <div>
                  <span className="text-xs font-mono uppercase text-muted-foreground block">Dew Risk</span>
                  <span className="text-xl font-bold font-mono capitalize">{String(groundConditions.dewRisk)}</span>
                </div>
                <div>
                  <span className="text-xs font-mono uppercase text-muted-foreground block">Seeing</span>
                  <span className="text-xl font-bold font-mono">{groundConditions.seeing}/8</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TargetsPanel({ data }: { data: StargazerData }) {
  return (
    <div className="space-y-6">
      <PlanetTable planets={data.planets} />
      <DeepSkyHighlights highlights={data.deepSkyHighlights} />
    </div>
  );
}

function EventsPanel({ data }: { data: StargazerData }) {
  // Merge meteor shower events with sky events so they appear in the timeline
  const meteorShowerEvents = (data.meteorShowers ?? []).map(s => {
    const now = new Date();
    let year = now.getFullYear();
    const peakDate = new Date(year, s.peakMonth - 1, s.peakDay);
    if (peakDate.getTime() < now.getTime()) year++;
    return {
    date: new Date(year, s.peakMonth - 1, s.peakDay),
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
      <SkyEvents events={combinedEvents} />
      <ISSPasses passes={data.issPasses} />
    </div>
  );
}

function LaunchesPanel({ data }: { data: StargazerData }) {
  return (
    <LaunchSchedule launches={data.launches} />
  );
}

// ============================================================================
// Main Page
// ============================================================================

function StargazerShell({
  children,
  themeClasses,
}: {
  children: React.ReactNode;
  themeClasses: ReturnType<typeof getComponentStyles>;
}) {
  return (
    <PageWrapper>
      <div className={cn('container mx-auto px-4 py-8', themeClasses.background)}>
        <div className="mb-8">
          <h1
            data-testid="stargazer-page-title"
            className={cn(
              'text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 font-mono',
              themeClasses.accentText,
              themeClasses.glow,
            )}
          >
            STARGAZER COMMAND CENTER
          </h1>
          <p className={cn('text-base sm:text-lg font-mono max-w-3xl', themeClasses.text)}>
            Tonight&apos;s astrophotography forecast. Seeing, transparency, moon phase, planet
            visibility, deep sky targets, ISS passes, and upcoming launches -- all in one place.
          </p>
          <p className="text-sm font-mono text-muted-foreground mt-2">
            Tonight: {formatTonightDate(new Date())}
          </p>
        </div>

        <ShareButtons
          config={{
            title: 'Stargazer - Astrophotography Forecast',
            text: "Tonight's stargazing conditions at 16bitweather.co",
            url: 'https://www.16bitweather.co/stargazer',
          }}
          className="mt-3 mb-6"
        />

        {children}
      </div>
    </PageWrapper>
  );
}

function StargazerPageContent() {
  const searchParams = useSearchParams();
  const { currentLocation, locationInput } = useLocationContext();
  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');
  const qParam = searchParams.get('q')?.trim() ?? '';
  const [data, setData] = useState<StargazerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StargazerTabId>('conditions');
  const [searchQuery, setSearchQuery] = useState(qParam);
  const [isSearching, setIsSearching] = useState(false);
  const lastLoadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (qParam) setSearchQuery(qParam);
  }, [qParam]);

  // Read hash on mount
  useEffect(() => {
    setActiveTab(getTabFromHash());

    const handleHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash on tab change
  const handleTabChange = useCallback((tab: StargazerTabId) => {
    setActiveTab(tab);
    window.location.hash = tab;
  }, []);

  const fetchData = useCallback(async (customLat?: number, customLon?: number, options?: { usedFallback?: boolean }) => {
    try {
      setIsLoading(true);
      setError(null);

      let latitude: number;
      let longitude: number;
      let usedFallback = options?.usedFallback ?? false;

      if (customLat != null && customLon != null) {
        latitude = customLat;
        longitude = customLon;
      } else {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        } catch {
          latitude = 40.7128;
          longitude = -74.006;
          usedFallback = true;
        }
      }

      const response = await fetch(
        `/api/stargazer?lat=${latitude}&lon=${longitude}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      setData(json);

      if (usedFallback) {
        setError(
          'Could not determine your location. Showing forecast for New York City. Enable location access for personalized forecasts.'
        );
      }
    } catch (err) {
      console.error('[Stargazer]', err);
      setError(
        'Failed to load stargazer forecast. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolveAndLoad = useCallback(async () => {
    const urlLat = parseCoord(latParam);
    const urlLon = parseCoord(lonParam);
    const loadKey = `${urlLat ?? ''},${urlLon ?? ''},${qParam},${locationInput},${currentLocation}`;

    if (lastLoadedKeyRef.current === loadKey) return;
    lastLoadedKeyRef.current = loadKey;

    if (qParam) {
      setSearchQuery(qParam);
    } else {
      const contextLabel = (locationInput || currentLocation)?.trim();
      if (contextLabel) setSearchQuery(contextLabel);
    }

    if (urlLat != null && urlLon != null) {
      await fetchData(urlLat, urlLon);
      return;
    }

    const contextLabel = (locationInput || currentLocation)?.trim();
    if (contextLabel) {
      const coords = await geocodeLabel(contextLabel);
      if (coords) {
        await fetchData(coords.lat, coords.lon);
        return;
      }
    }

    await fetchData();
  }, [latParam, lonParam, qParam, locationInput, currentLocation, fetchData]);

  const handleLocationSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const geoRes = await fetch(`/api/weather/geocoding?q=${encodeURIComponent(searchQuery.trim())}&limit=1`);
      if (!geoRes.ok) {
        setError('Location not found. Try a different search.');
        return;
      }
      const geoData = await geoRes.json();
      const result = Array.isArray(geoData) ? geoData[0] : geoData;
      if (result?.lat != null && result?.lon != null) {
        setSearchQuery('');
        await fetchData(result.lat, result.lon);
      } else {
        setError('Location not found. Try a different search.');
      }
    } catch {
      setError('Failed to search location.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, fetchData]);

  useEffect(() => {
    startTransition(() => {
      void resolveAndLoad();
    });
  }, [resolveAndLoad]);

  return (
    <>
        {/* Location Search */}
        <form onSubmit={handleLocationSearch} className="mb-6 flex gap-2 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Stargazer location search"
            data-testid="stargazer-location-search"
            placeholder="Search location (city, state)"
            className="flex-1 px-3 py-2 text-sm font-mono bg-black/20 border border-subtle rounded focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2 text-sm font-mono font-bold border border-subtle rounded hover:bg-white/10 disabled:opacity-40 transition-colors"
          >
            {isSearching ? '...' : 'Go'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 container-primary border-red-500/40 font-mono text-sm text-red-400">
            {error}
          </div>
        )}

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
            {/* Persistent Header Card */}
            <PersistentHeader data={data} />

            {/* Tab Navigation */}
            <StargazerNav activeTab={activeTab} onTabChange={handleTabChange} />

            {/* Tab Content */}
            <div
              role="tabpanel"
              id={`panel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
            >
              {activeTab === 'conditions' && <ConditionsPanel data={data} />}
              {activeTab === 'targets' && <TargetsPanel data={data} />}
              {activeTab === 'events' && <EventsPanel data={data} />}
              {activeTab === 'launches' && <LaunchesPanel data={data} />}
            </div>

            {/* Attribution */}
            <StargazerAttribution />
          </div>
        )}
    </>
  );
}

export default function StargazerPage() {
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');

  return (
    <StargazerShell themeClasses={themeClasses}>
      <Suspense
        fallback={
          <p className="font-mono text-sm text-muted-foreground animate-pulse">Loading location…</p>
        }
      >
        <StargazerPageContent />
      </Suspense>
    </StargazerShell>
  );
}

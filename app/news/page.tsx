/**
 * 16-Bit Weather Platform - News Page (RSS Aggregator)
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import PageWrapper from '@/components/page-wrapper';
import NewsHero from '@/components/news/NewsHero';
import NewsFilter from '@/components/news/NewsFilter';
import NewsGrid from '@/components/news/NewsGrid';
import NewsCard from '@/components/news/NewsCard';
import NewsSkeleton from '@/components/news/NewsSkeleton';
import NewsFeedBanner from '@/components/news/NewsFeedBanner';
import NewsSourceRow from '@/components/news/NewsSourceRow';
import NewsCategorySections from '@/components/news/NewsCategorySections';
import NewsSeoContent from '@/components/news/news-seo-content';
import { projectNewsSnapshot } from '@/lib/news/snapshot';
import { excludeRailIds, groupItemsByCategory, isVerifiedActiveWarning } from '@/lib/news/rails';
import type { NewsSourceHealth } from '@/lib/news/types';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';
import type { FeedCategory } from '@/lib/services/rss/feedSources';

type FilterCategory = FeedCategory | 'all';

interface NewsStats {
  byCategory: Record<string, number>;
  errors?: string[];
  enabledSources?: string[];
}

function hydrateItems(items: RSSItem[]): RSSItem[] {
  return items.map((item) => ({
    ...item,
    timestamp: new Date(item.timestamp),
  }));
}

/** Short "Updated Xm ago" string for the freshness indicator. */
function formatUpdatedAgo(date: Date): string {
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function NewsPage(): React.JSX.Element {
  const themeClasses = themeTokens.weather;

  const [news, setNews] = useState<RSSItem[]>([]);
  const [delayedNews, setDelayedNews] = useState<RSSItem[]>([]);
  const [sources, setSources] = useState<NewsSourceHealth[]>([]);
  const [happeningNow, setHappeningNow] = useState<RSSItem[]>([]);
  const [featuredStory, setFeaturedStory] = useState<RSSItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<NewsStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);
  const lastItemsRef = useRef<RSSItem[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const fetchNews = useCallback(async (category: FilterCategory, options?: { initial?: boolean }) => {
    const initial = options?.initial ?? false;
    const requestId = ++requestIdRef.current;
    try {
      if (initial) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const params = new URLSearchParams({ maxItems: '60', maxAge: '72' });
      if (category !== 'all') params.set('categories', category);

      const response = await fetch(`/api/news/rss?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch news');

      const data = await response.json();
      if (requestId !== requestIdRef.current) return;
      if (data.status !== 'ok' || !Array.isArray(data.items)) {
        throw new Error(data.message || 'No news available');
      }

      const items = hydrateItems(data.items);
      const delayed = Array.isArray(data.delayedItems) ? hydrateItems(data.delayedItems) : [];
      lastItemsRef.current = [...items, ...delayed];
      setDelayedNews(delayed);
      setSources(Array.isArray(data.sources) ? data.sources : []);
      setNow(Date.now());
      setNews(items);
      setHappeningNow(Array.isArray(data.happeningNow) ? hydrateItems(data.happeningNow) : []);
      setFeaturedStory(data.featured ? hydrateItems([data.featured])[0] : null);
      setStats(data.stats ?? null);
      setLastUpdated(data.lastUpdated ? new Date(data.lastUpdated) : null);
      hasLoadedRef.current = true;
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('[news] Error fetching news:', err);
      setError(err instanceof Error ? err.message : 'Failed to load news');
      setHappeningNow([]);
      setFeaturedStory(null);
      setNews([]);
      setDelayedNews(lastItemsRef.current.map(item => ({ ...item, sourceState: 'delayed', lifecycle: 'unverified' })));
      setSources(previous => previous.map(source => ({ ...source, state: 'delayed' })));
      if (initial) {
        setNews([]);
        setHappeningNow([]);
        setFeaturedStory(null);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // A cached response cannot keep a warning active beyond its evidence deadline.
  // Periodic network refresh and reading-state preservation belong to phase 4.
  useEffect(() => {
    const deadlines = [...sources.flatMap(source => [source.freshUntil, source.retainedUntil]), ...news.flatMap(item => [item.freshUntil, item.warning?.expires, item.warning?.ends])]
      .map(value => value ? Date.parse(value) : NaN).filter(time => Number.isFinite(time) && time > now);
    if (!deadlines.length) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, Math.min(...deadlines) - Date.now()));
    return () => clearTimeout(timer);
  }, [news, sources, now]);

  const projected = useMemo(() => projectNewsSnapshot([...news, ...delayedNews], sources, now), [news, delayedNews, sources, now]);
  const activeNow = useMemo(() => projected.items.filter(item => happeningNow.some(active => active.id === item.id) && isVerifiedActiveWarning(item, now)), [projected.items, happeningNow, now]);
  const currentFeatured = projected.items.find(item => item.id === featuredStory?.id) ?? null;
  const visibleDelayed = useMemo(() => projected.delayedItems.filter(item =>
    (currentCategory === 'all' || item.category === currentCategory) &&
    (!searchQuery.trim() || [item.title, item.description, item.source, item.location].some(value => value?.toLowerCase().includes(searchQuery.trim().toLowerCase())))),
  [projected.delayedItems, currentCategory, searchQuery]);

  useEffect(() => {
    void fetchNews(currentCategory, { initial: !hasLoadedRef.current });
  }, [currentCategory, fetchNews]);

  const filteredNews = useMemo(() => {
    let filtered = [...projected.items];
    if (currentCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === currentCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.source.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query),
      );
    }
    return filtered;
  }, [projected.items, currentCategory, searchQuery]);

  const isHomeView = currentCategory === 'all' && !searchQuery;
  const showInitialSkeleton = isLoading && news.length === 0;

  const railItems = useMemo(() => {
    const rails: RSSItem[] = [...activeNow];
    if (currentFeatured && isHomeView) rails.push(currentFeatured);
    return rails;
  }, [activeNow, currentFeatured, isHomeView]);

  const gridItems = useMemo(() => {
    const deduped = isHomeView ? excludeRailIds(filteredNews, railItems) : filteredNews;
    return deduped;
  }, [filteredNews, railItems, isHomeView]);

  const groupedSections = useMemo(() => {
    if (!isHomeView || showInitialSkeleton) return [];
    return groupItemsByCategory(gridItems);
  }, [gridItems, isHomeView, showInitialSkeleton]);

  const handleRefresh = useCallback(() => {
    void fetchNews(currentCategory, { initial: false });
  }, [fetchNews, currentCategory]);

  const getEmptyType = (): 'no-alerts' | 'no-results' | 'error' | 'no-news' => {
    if (error) return 'error';
    if (searchQuery) return 'no-results';
    if (currentCategory === 'severe' && news.length === 0) {
      return projected.sources.find(source => source.id === 'nws-alerts')?.state === 'fresh' && !stats?.errors?.length ? 'no-alerts' : 'error';
    }
    if (projected.sources.some(source => source.state !== 'fresh') && !projected.items.length) return 'error';
    if (currentCategory !== 'all') return 'no-results';
    return 'no-news';
  };

  const feedErrorCount = Math.max(stats?.errors?.length ?? 0, projected.sources.filter(source => source.state !== 'fresh').length);

  return (
    <PageWrapper>
      <div className={cn('container mx-auto px-4 py-6', themeClasses.background)}>
        <div className="news-page-header mb-6 border-b-2 border-primary/30 pb-6">
          <h1
            className={cn(
              'text-3xl sm:text-4xl md:text-5xl font-extrabold mb-2 font-mono text-primary',
            )}
          >
            EARTH & SPACE NEWS
          </h1>
          <p className={cn('text-sm sm:text-base font-mono', themeClasses.text)}>
            Official hazard reports, outlooks, and science reading · Verified active coverage starts with NWS warnings
          </p>
          {lastUpdated && !showInitialSkeleton && (
            <p
              className={cn(
                'text-xs font-mono mt-2 opacity-70 flex items-center gap-1.5',
                themeClasses.text,
              )}
              aria-live="polite"
            >
              Feed assembled {formatUpdatedAgo(lastUpdated)} · source check times below
              {isRefreshing && <span className="opacity-70"> — refreshing…</span>}
            </p>
          )}
        </div>

        <NewsFilter
          onCategoryChange={setCurrentCategory}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefresh}
          currentCategory={currentCategory}
          searchQuery={searchQuery}
          isLoading={isLoading || isRefreshing}
          className="mb-6"
        />

        {!showInitialSkeleton && feedErrorCount > 0 && (
          <NewsFeedBanner errorCount={feedErrorCount} />
        )}
        {!showInitialSkeleton && <NewsSourceRow sources={stats?.enabledSources ?? []} health={projected.sources} />}

        {showInitialSkeleton ? (
          <div className="space-y-8">
            <NewsSkeleton variant="hero" />
            <NewsSkeleton count={6} />
          </div>
        ) : (
          <>
            {isHomeView && activeNow.length > 0 && (
              <div className="mb-8">
                <h2
                  className={cn(
                    'text-xl font-bold font-mono mb-4 flex items-center gap-2',
                    themeClasses.headerText,
                  )}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse news-live-dot"
                    aria-hidden="true"
                  />
                  HAPPENING NOW
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeNow.map((item) => (
                    <NewsCard key={`now-${item.id}`} item={item} variant="compact" />
                  ))}
                </div>
              </div>
            )}

            {isHomeView && currentFeatured && (
              <div className="mb-8">
                <h2 className={cn('text-xl font-bold font-mono mb-4', themeClasses.headerText)}>
                  TOP STORY
                </h2>
                <NewsHero item={currentFeatured} />
              </div>
            )}

            <div>
              {currentCategory !== 'all' || searchQuery ? (
                <h2 className={cn('text-xl font-bold font-mono mb-4', themeClasses.headerText)}>
                  {filteredNews.length} RESULT{filteredNews.length !== 1 ? 'S' : ''} FOUND
                </h2>
              ) : (
                <h2 className={cn('text-xl font-bold font-mono mb-4', themeClasses.headerText)}>
                  LATEST NEWS
                </h2>
              )}

              {isHomeView && groupedSections.length > 0 ? (
                <NewsCategorySections sections={groupedSections} />
              ) : (
                <NewsGrid
                  items={gridItems}
                  isLoading={false}
                  error={error}
                  emptyType={getEmptyType()}
                  onRetry={handleRefresh}
                />
              )}
            </div>
            {visibleDelayed.length > 0 && <section className="mt-8" aria-labelledby="delayed-reports-title">
              <h2 id="delayed-reports-title" className="text-xl font-bold font-mono mb-2">DELAYED REPORTS</h2>
              <p className="text-sm mb-4">Last-known reports. Current conditions cannot be verified from these sources.</p>
              <NewsGrid items={visibleDelayed} />
            </section>}
          </>
        )}

        {!showInitialSkeleton && news.length > 0 && (
          <div className={cn('mt-8 pt-6 border-t border-subtle text-center')}>
            <p className={cn('text-xs font-mono', themeClasses.text)}>
              Showing {gridItems.length} of {news.length} articles
              {currentCategory !== 'all' && ` in ${currentCategory.toUpperCase()}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
            {stats?.byCategory && (
              <p className={cn('text-xs font-mono mt-2', themeClasses.text)}>
                {Object.entries(stats.byCategory)
                  .filter(([, count]) => count > 0)
                  .map(([cat, count]) => `${cat}: ${count}`)
                  .join(' • ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Evergreen crawlable copy — the wire above is fetched client-side */}
      <NewsSeoContent />
    </PageWrapper>
  );
}

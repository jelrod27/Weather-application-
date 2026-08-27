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
import { excludeRailIds, groupItemsByCategory } from '@/lib/news/rails';
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

export default function NewsPage() {
  const themeClasses = themeTokens.weather;

  const [news, setNews] = useState<RSSItem[]>([]);
  const [happeningNow, setHappeningNow] = useState<RSSItem[]>([]);
  const [featuredStory, setFeaturedStory] = useState<RSSItem | null>(null);
  const [filteredNews, setFilteredNews] = useState<RSSItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<NewsStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchNews = useCallback(async (category: FilterCategory, options?: { initial?: boolean }) => {
    const initial = options?.initial ?? false;
    try {
      if (initial) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const params = new URLSearchParams({ maxItems: '60', maxAge: '72' });
      if (category !== 'all') params.set('categories', category);

      const response = await fetch(`/api/news/rss?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch news');

      const data = await response.json();
      if (data.status !== 'ok' || !Array.isArray(data.items)) {
        throw new Error(data.message || 'No news available');
      }

      const items = hydrateItems(data.items);
      setNews(items);
      setFilteredNews(items);
      setHappeningNow(Array.isArray(data.happeningNow) ? hydrateItems(data.happeningNow) : []);
      setFeaturedStory(data.featured ? hydrateItems([data.featured])[0] : null);
      setStats(data.stats ?? null);
      setLastUpdated(data.lastUpdated ? new Date(data.lastUpdated) : new Date());
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('[news] Error fetching news:', err);
      setError(err instanceof Error ? err.message : 'Failed to load news');
      if (initial) {
        setNews([]);
        setFilteredNews([]);
        setHappeningNow([]);
        setFeaturedStory(null);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchNews(currentCategory, { initial: !hasLoadedRef.current });
  }, [currentCategory, fetchNews]);

  useEffect(() => {
    let filtered = [...news];
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
    setFilteredNews(filtered);
  }, [news, currentCategory, searchQuery]);

  const isHomeView = currentCategory === 'all' && !searchQuery;
  const showInitialSkeleton = isLoading && news.length === 0;

  const railItems = useMemo(() => {
    const rails: RSSItem[] = [...happeningNow];
    if (featuredStory && isHomeView) rails.push(featuredStory);
    return rails;
  }, [happeningNow, featuredStory, isHomeView]);

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
    if (currentCategory === 'severe' && news.length === 0) return 'no-alerts';
    if (currentCategory !== 'all') return 'no-results';
    return 'no-news';
  };

  const feedErrorCount = stats?.errors?.length ?? 0;

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
            Real-time hazard feeds from USGS, NASA, NOAA, NWS, NHC, and science publishers
          </p>
          {lastUpdated && !showInitialSkeleton && (
            <p
              className={cn(
                'text-xs font-mono mt-2 opacity-70 flex items-center gap-1.5',
                themeClasses.text,
              )}
              aria-live="polite"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
              Updated {formatUpdatedAgo(lastUpdated)}
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

        {showInitialSkeleton ? (
          <div className="space-y-8">
            <NewsSkeleton variant="hero" />
            <NewsSkeleton count={6} />
          </div>
        ) : (
          <>
            {isHomeView && happeningNow.length > 0 && (
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
                  {happeningNow.map((item) => (
                    <NewsCard key={`now-${item.id}`} item={item} variant="compact" />
                  ))}
                </div>
              </div>
            )}

            {isHomeView && featuredStory && (
              <div className="mb-8">
                <h2 className={cn('text-xl font-bold font-mono mb-4', themeClasses.headerText)}>
                  TOP STORY
                </h2>
                <NewsHero item={featuredStory} />
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
            <NewsSourceRow sources={stats?.enabledSources ?? []} />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

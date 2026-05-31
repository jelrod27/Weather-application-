/**
 * 16-Bit Weather Platform - News Page (RSS Aggregator)
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 *
 * Multi-source RSS news aggregation: Earthquakes, Volcanoes, Space, Climate, Severe Weather
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils';
import PageWrapper from '@/components/page-wrapper';
import NewsHero from '@/components/news/NewsHero';
import NewsFilter from '@/components/news/NewsFilter';
import NewsGrid from '@/components/news/NewsGrid';
import NewsCard from '@/components/news/NewsCard';
import type { RSSItem } from '@/lib/services/rss/rssAggregator';
import type { FeedCategory } from '@/lib/services/rss/feedSources';

type FilterCategory = FeedCategory | 'all';

// "Happening Now" = high-priority items from the last 6 hours.
const HAPPENING_NOW_WINDOW_MS = 6 * 60 * 60 * 1000;
const HAPPENING_NOW_MAX = 8;

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
  const { theme } = useTheme();
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather');

  // State
  const [news, setNews] = useState<RSSItem[]>([]);
  const [featuredStory, setFeaturedStory] = useState<RSSItem | null>(null);
  const [filteredNews, setFilteredNews] = useState<RSSItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<{ byCategory: Record<string, number> } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch news from RSS API
  const fetchNews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/news/rss?maxItems=60&maxAge=72');

      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }

      const data = await response.json();

      if (data.status === 'ok' && data.items) {
        // Convert timestamp strings to Date objects
        const items = data.items.map((item: RSSItem) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        setNews(items);
        setFilteredNews(items);
        setStats(data.stats);
        setLastUpdated(data.lastUpdated ? new Date(data.lastUpdated) : new Date());
      } else {
        throw new Error(data.message || 'No news available');
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      setError(err instanceof Error ? err.message : 'Failed to load news');
      setNews([]);
      setFilteredNews([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch featured story
  const fetchFeaturedStory = useCallback(async () => {
    try {
      const response = await fetch('/api/news/rss?featured=true');

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (data.status === 'ok' && data.featured) {
        setFeaturedStory({
          ...data.featured,
          timestamp: new Date(data.featured.timestamp),
        });
      }
    } catch (err) {
      console.error('Error fetching featured story:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNews();
    fetchFeaturedStory();
  }, [fetchNews, fetchFeaturedStory]);

  // Filter news based on category and search query
  useEffect(() => {
    let filtered = [...news];

    // Filter by category
    if (currentCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === currentCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.source.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query)
      );
    }

    setFilteredNews(filtered);
  }, [news, currentCategory, searchQuery]);

  // The default "home" view (unfiltered, no search) gets the Happening Now rail,
  // featured story, and category grouping; an active tab/search shows flat results.
  const isHomeView = currentCategory === 'all' && !searchQuery;

  // "Happening Now": recent high-priority hazards (severe alerts, M6+ quakes,
  // NHC active systems). Only surfaced on the home view; omitted entirely when empty.
  const happeningNow = useMemo(() => {
    if (!isHomeView) return [];
    const cutoff = Date.now() - HAPPENING_NOW_WINDOW_MS;
    return news
      .filter((item) => item.priority === 'high' && new Date(item.timestamp).getTime() >= cutoff)
      .slice(0, HAPPENING_NOW_MAX);
  }, [news, isHomeView]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    fetchNews();
    fetchFeaturedStory();
  }, [fetchNews, fetchFeaturedStory]);

  // Determine empty state type
  const getEmptyType = (): 'no-alerts' | 'no-results' | 'error' | 'no-news' => {
    if (error) return 'error';
    if (searchQuery || currentCategory !== 'all') return 'no-results';
    return 'no-news';
  };

  return (
    <PageWrapper>
      <div className={cn('container mx-auto px-4 py-6', themeClasses.background)}>
        {/* Header */}
        <div className="mb-6">
          <h1
            className={cn(
              'text-3xl sm:text-4xl md:text-5xl font-extrabold mb-2 font-mono',
              // text-primary (not accentText/text-primary-foreground): the latter
              // is near-white and disappears on the light Daybreak background.
              'text-primary'
            )}
          >
            EARTH & SPACE NEWS
          </h1>
          <p className={cn('text-sm sm:text-base font-mono', themeClasses.text)}>
            Real-time feeds from USGS, NASA, NOAA, NWS, and scientific sources
          </p>
          {lastUpdated && !isLoading && (
            <p
              className={cn('text-xs font-mono mt-1 opacity-70 flex items-center gap-1.5', themeClasses.text)}
              aria-live="polite"
            >
              <span
                className="inline-block w-2 h-2 rounded-full bg-green-500"
                aria-hidden="true"
              />
              Updated {formatUpdatedAgo(lastUpdated)}
            </p>
          )}
        </div>

        {/* Filter Controls */}
        <NewsFilter
          onCategoryChange={setCurrentCategory}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefresh}
          currentCategory={currentCategory}
          searchQuery={searchQuery}
          isLoading={isLoading}
          className="mb-6"
        />

        {/* Happening Now rail — recent high-priority hazards. Omitted when empty. */}
        {isHomeView && !isLoading && happeningNow.length > 0 && (
          <div className="mb-8">
            <h2 className={cn('text-xl font-bold font-mono mb-4 flex items-center gap-2', themeClasses.headerText)}>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
              HAPPENING NOW
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {happeningNow.map((item) => (
                <NewsCard key={`now-${item.id}`} item={item} variant="compact" />
              ))}
            </div>
          </div>
        )}

        {/* Featured Story */}
        {featuredStory && !isLoading && currentCategory === 'all' && !searchQuery && (
          <div className="mb-8">
            <h2 className={cn('text-xl font-bold font-mono mb-4', themeClasses.headerText)}>
              TOP STORY
            </h2>
            <NewsHero item={featuredStory} />
          </div>
        )}

        {/* News Grid */}
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

          <NewsGrid
            items={filteredNews}
            isLoading={isLoading}
            error={error}
            emptyType={getEmptyType()}
            onRetry={handleRefresh}
          />
        </div>

        {/* Stats Footer */}
        {!isLoading && news.length > 0 && (
          <div className={cn('mt-8 pt-6 border-t border-subtle text-center')}>
            <p className={cn('text-xs font-mono', themeClasses.text)}>
              Showing {filteredNews.length} of {news.length} articles
              {currentCategory !== 'all' && ` in ${currentCategory.toUpperCase()}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
            {stats && (
              <p className={cn('text-xs font-mono mt-2', themeClasses.text)}>
                {Object.entries(stats.byCategory)
                  .filter(([, count]) => count > 0)
                  .map(([cat, count]) => `${cat}: ${count}`)
                  .join(' • ')}
              </p>
            )}
            <p className={cn('text-xs font-mono mt-2 opacity-70', themeClasses.text)}>
              Sources: USGS • NASA • NOAA • NWS • NHC • SPC • ScienceDaily
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

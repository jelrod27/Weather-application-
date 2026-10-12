'use client';

import React, { useEffect, useRef, useState } from 'react';
import PageWrapper from '@/components/page-wrapper';
import NewsFilter from '@/components/news/NewsFilter';
import NewsSkeleton from '@/components/news/NewsSkeleton';
import NewsEmpty from '@/components/news/NewsEmpty';
import NewsFeedBanner from '@/components/news/NewsFeedBanner';
import NewsSourceRow from '@/components/news/NewsSourceRow';
import NewsCategorySections from '@/components/news/NewsCategorySections';
import NewsSeoContent from '@/components/news/news-seo-content';
import { useNewsFeed } from '@/hooks/use-news-feed';
import { useNewsReadingPosition } from '@/hooks/use-news-reading-position';
import type { NewsSectionId } from '@/lib/news/sections';
import type { FeedCategory } from '@/lib/services/rss/feedSources';

interface NewsView {
  category: FeedCategory | 'all';
  query: string;
  section?: NewsSectionId;
  offset: number;
}

function assembledAge(raw: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(raw)) / 60_000));
  return minutes < 1 ? 'just now' : minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
}

export default function NewsPage(): React.JSX.Element {
  const [view, setView] = useState<NewsView>({ category: 'all', query: '', offset: 0 });
  const focusAfterLoad = useRef<NewsSectionId | 'overview' | null>(null);
  const preservePosition = useNewsReadingPosition();
  const feed = useNewsFeed(view, preservePosition);
  const data = feed.displayed;
  const errors = data?.sources.filter(source => source.state !== 'fresh').length ?? 0;
  const total = data?.sections.reduce((sum, section) => sum + section.total, 0) ?? 0;
  useEffect(() => {
    if (!feed.viewSettled || !focusAfterLoad.current) return;
    // A removed navigation button leaves focus on body. Respect any control the reader chose while loading.
    if (document.activeElement === document.body) {
      const target = document.getElementById(`news-${focusAfterLoad.current}-title`) ?? document.getElementById('news-refresh');
      target?.focus();
    }
    focusAfterLoad.current = null;
  }, [feed.viewSettled, data]);

  return <PageWrapper>
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6 border-b-2 border-primary/30 pb-6">
        <h1 id="news-overview-title" tabIndex={-1} className="mb-2 font-mono text-3xl font-extrabold text-primary sm:text-4xl md:text-5xl">EARTH & SPACE NEWS</h1>
        <p className="font-mono text-sm sm:text-base">Official hazard reports, outlooks, and science reading · Verified active coverage starts with NWS warnings</p>
        {data && <p className="mt-2 text-xs font-mono text-muted-foreground">Feed assembled {assembledAge(data.lastUpdated, feed.now)} · source check times below</p>}
      </header>
      <NewsFilter currentCategory={view.category} searchQuery={view.query}
        onCategoryChange={category => { focusAfterLoad.current = null; setView(previous => ({ ...previous, category, section: undefined, offset: 0 })); }}
        onSearchChange={query => {
          if (query === view.query) return;
          focusAfterLoad.current = null;
          setView(previous => ({ ...previous, query, section: undefined, offset: 0 }));
        }}
        onRefresh={feed.refresh} isLoading={feed.loading || feed.refreshing} className="mb-4" />
      <div className="mb-6 flex flex-col items-stretch gap-3 rounded border border-primary/25 p-3 text-sm sm:flex-row sm:flex-wrap sm:items-center">
        <button type="button" disabled={!feed.pending || feed.refreshing} onClick={feed.applyPending}
          className="shrink-0 self-start border-2 border-primary px-3 py-2 font-mono text-primary disabled:opacity-40">Apply latest feed</button>
        <p role="status" className="min-w-0 flex-1">
          {feed.refreshing ? 'Checking sources…' : feed.pending ? 'A fresh check is ready. Apply it when you are ready to update these cards.'
            : 'Checks every 2 minutes while visible. New cards wait here so you can keep your place.'}
        </p>
        {feed.checkedAt && <span className="text-xs text-muted-foreground">Latest feed check {assembledAge(new Date(feed.checkedAt).toISOString(), feed.now)}</span>}
      </div>
      {feed.error && <p role="alert" className="mb-4 border-2 border-amber-600 p-3 text-sm">{feed.error}</p>}
      {errors > 0 && <NewsFeedBanner errorCount={errors} />}
      {data && <NewsSourceRow sources={data.sources.map(source => source.name)} health={data.sources} />}
      <div className="my-5 flex flex-wrap items-center gap-3">
        {view.section && <button type="button" onClick={() => { focusAfterLoad.current = 'overview'; setView(previous => ({ ...previous, section: undefined, offset: 0 })); }}
          className="border-2 px-3 py-2 text-sm font-mono">Back to overview</button>}
        {(view.query || view.category !== 'all') && data && <p role="status" className="text-sm font-mono">{data.countsArePartial
          ? `${total} retained matches · full counts need a fresh check` : `${total} matching reports in the available source set`}</p>}
      </div>
      {feed.loading && !data ? <NewsSkeleton count={6} /> : data ? <>
        <NewsCategorySections sections={data.sections} selectedSection={view.section} busy={feed.refreshing} countsArePartial={data.countsArePartial}
          onViewAll={section => { focusAfterLoad.current = section; setView(previous => ({ ...previous, section, offset: 0 })); }}
          onPageChange={offset => { focusAfterLoad.current = view.section ?? null; setView(previous => ({ ...previous, offset })); }} />
        {total === 0 && <NewsEmpty type="no-results" message="No matching reports in the available feeds. Missing or incomplete sources do not establish clear conditions." />}
        <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">Counts describe the displayed check and can change between pages. Search includes reports beyond the overview. Source coverage lists provider limits; this is a national/global overview, not a complete archive.</p>
      </> : !feed.loading && <NewsEmpty type="error" onRetry={feed.refresh} />}
    </div>
    <NewsSeoContent />
  </PageWrapper>;
}

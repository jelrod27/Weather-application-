'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { delayNewsReading, projectNewsReading, reconcileNewsEvidence, retainNewsContext } from '@/lib/news/reading-state';
import type { NewsBrowseOptions, NewsBrowseResult } from '@/lib/news/sections';
import type { FeedCategory } from '@/lib/services/rss/feedSources';

const REFRESH_MS = 2 * 60_000;
const MAX_RETRY_MS = 15 * 60_000;
const REQUEST_TIMEOUT_MS = 45_000;

interface NewsFeedOptions extends NewsBrowseOptions {
  category: FeedCategory | 'all';
}

interface NewsFeedState {
  requestUrl: string | null;
  displayed: NewsBrowseResult | null;
  pending: NewsBrowseResult | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  checkedAt: number | null;
}

interface NewsFeedView extends NewsFeedState {
  viewReady: boolean;
  now: number;
  refresh: () => void;
  applyPending: () => void;
}

function hydrate(raw: NewsBrowseResult): NewsBrowseResult {
  if (!Array.isArray(raw.sections) || !Array.isArray(raw.sources) || !Array.isArray(raw.activeIds) ||
      !Number.isFinite(Date.parse(raw.lastUpdated))) throw new Error('News response was incomplete');
  return { ...raw, sections: raw.sections.map(section => ({
    ...section, items: section.items.map(item => ({ ...item, timestamp: new Date(item.timestamp) })),
  })) };
}

/** One visible-page request at a time. Background data is staged until explicitly applied. */
export function useNewsFeed(options: NewsFeedOptions, beforeChange: () => void): NewsFeedView {
  const [state, setState] = useState<NewsFeedState>({ requestUrl: null, displayed: null, pending: null, error: null, loading: true, refreshing: false, checkedAt: null });
  const [now, setNow] = useState(() => Date.now());
  const requestRef = useRef<(apply: boolean) => void>(() => {});
  const changeRef = useRef(beforeChange);
  useEffect(() => { changeRef.current = beforeChange; }, [beforeChange]);
  const params = new URLSearchParams({ view: 'sections', maxAge: '72' });
  if (options.category !== 'all') params.set('categories', options.category);
  if (options.query) params.set('q', options.query);
  if (options.section) params.set('section', options.section);
  if (options.offset) params.set('offset', String(options.offset));
  const url = `/api/news/rss?${params}`;

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let nextAttempt = 0;
    let failures = 0;
    changeRef.current();
    setState({ requestUrl: url, displayed: null, pending: null, error: null, loading: true, refreshing: false, checkedAt: null });

    function schedule(): void {
      clearTimeout(timer);
      if (!disposed && document.visibilityState !== 'hidden') {
        timer = setTimeout(() => { void request(false); }, Math.max(0, nextAttempt - Date.now()));
      }
    }

    async function request(apply: boolean): Promise<void> {
      if (disposed || controller || document.visibilityState === 'hidden') return;
      const active = new AbortController();
      controller = active;
      let timedOut = false;
      const timeout = setTimeout(() => { timedOut = true; active.abort(); }, REQUEST_TIMEOUT_MS);
      changeRef.current();
      setState(previous => ({ ...previous, refreshing: true }));
      try {
        const response = await fetch(url, { signal: active.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('News sources could not be checked');
        const raw = await response.json();
        if (raw.status !== 'ok') throw new Error('News response was incomplete');
        const data = hydrate(raw);
        if (disposed || active.signal.aborted) return;
        failures = 0;
        changeRef.current();
        setNow(Date.now());
        setState(previous => {
          const latest = retainNewsContext(data, previous.displayed, Date.now());
          return { ...previous, error: null, checkedAt: Date.now(),
            displayed: apply || !previous.displayed ? latest : reconcileNewsEvidence(previous.displayed, latest),
            pending: apply || !previous.displayed ? null : latest,
          };
        });
      } catch {
        if (disposed || (active.signal.aborted && !timedOut)) return;
        failures++;
        changeRef.current();
        setState(previous => ({ ...previous, pending: null, error: 'Refresh failed. Retained reports are delayed; current conditions could not be verified.',
          displayed: previous.displayed ? delayNewsReading(previous.displayed) : null,
        }));
      } finally {
        clearTimeout(timeout);
        if (controller === active) controller = null;
        if (!disposed) {
          nextAttempt = active.signal.aborted && !timedOut ? 0
            : Date.now() + Math.min(MAX_RETRY_MS, REFRESH_MS * 2 ** failures);
          setState(previous => ({ ...previous, loading: false, refreshing: false }));
          schedule();
        }
      }
    }

    function visibilityChanged(): void {
      if (document.visibilityState === 'hidden') {
        clearTimeout(timer);
        controller?.abort();
      } else {
        changeRef.current();
        setNow(Date.now());
        if (Date.now() >= nextAttempt) void request(false);
        else schedule();
      }
    }
    requestRef.current = apply => { clearTimeout(timer); void request(apply); };
    document.addEventListener('visibilitychange', visibilityChanged);
    void request(true);
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); document.removeEventListener('visibilitychange', visibilityChanged); };
  }, [url]);

  // Update relative ages every 30 seconds, and meet exact source/expiry deadlines.
  useEffect(() => {
    const updateClock = (): void => { changeRef.current(); setNow(Date.now()); };
    const deadlines = state.displayed ? [
      ...state.displayed.sources.flatMap(source => [source.freshUntil, source.retainedUntil]),
      ...state.displayed.sections.flatMap(section => section.items.flatMap(item => [item.freshUntil, item.warning?.expires, item.warning?.ends])),
    ].map(value => value ? Date.parse(value) : NaN).filter(time => Number.isFinite(time) && time > now) : [];
    const tick = setTimeout(() => { if (document.visibilityState !== 'hidden') updateClock(); }, Math.max(0, Math.min(Date.now() + 30_000, ...deadlines) - Date.now()));
    return () => clearTimeout(tick);
  }, [state.displayed, now]);

  const refresh = useCallback(() => requestRef.current(true), []);
  const applyPending = useCallback(() => {
    beforeChange();
    setNow(Date.now());
    setState(previous => previous.pending ? { ...previous, displayed: previous.pending, pending: null } : previous);
  }, [beforeChange]);
  const displayed = useMemo(() => state.displayed ? projectNewsReading(state.displayed, now) : null, [state.displayed, now]);
  return { ...state, displayed, now, refresh, applyPending, viewReady: state.requestUrl === url && !state.loading && displayed !== null };
}

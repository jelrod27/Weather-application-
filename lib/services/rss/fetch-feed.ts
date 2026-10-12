/**
 * Fetch a single RSS/Atom/JSON feed and report health to Sentry.
 */

import * as Sentry from '@sentry/nextjs';
import { parseFeedDocument } from './parse-document';
import { fetchNwsNews } from './nws-feed';
import { sourcePolicy } from './source-policy';
import type { ParsedFeed } from './parse-document';
import type { RSSItem } from './parse-feed';
import type { NewsSourceHealth } from '@/lib/news/types';
import type { FeedSource } from './feedSources';

/**
 * Report an unhealthy feed to Sentry so a dead source is visible within one
 * refresh cycle instead of silently emptying its category (see PRD §12 / G3 —
 * this is what the decommissioned NWS alerts feed lacked).
 *
 * Real fetch/HTTP/timeout failures emit a warning-level message (creates an
 * issue). A feed that fetched OK but parsed to zero items emits a breadcrumb
 * only — high-priority feeds like nws-alerts can legitimately be empty during
 * calm weather, so we avoid raising a noisy issue for that case.
 */
export function reportFeedHealth(
  source: FeedSource,
  reason: string,
  kind: 'fetch-error' | 'empty-parse'
): void {
  Sentry.addBreadcrumb({
    category: 'news.feed',
    level: 'warning',
    message: `feed unhealthy (${kind}): ${source.id}`,
    data: { sourceId: source.id, category: source.category, reason },
  });

  if (kind === 'fetch-error' && source.priority === 'high') {
    Sentry.captureMessage('[news] high-priority feed down', {
      level: 'warning',
      tags: { context: 'news', sourceId: source.id },
      extra: { source: source.id, category: source.category, reason },
    });
  }
}

/**
 * Fetch and parse a single RSS/Atom feed
 */
export interface FeedResult { items: RSSItem[]; health: NewsSourceHealth }

interface StoredSource {
  result: FeedResult;
  nextAttemptAt: number;
}

// Warm-instance only. Cold instances truthfully report unavailable when a request fails.
const snapshots = new Map<string, StoredSource>();
const pending = new Map<string, Promise<void>>();

async function retrieve(source: FeedSource): Promise<ParsedFeed> {
  if (source.id === 'nws-alerts') return fetchNwsNews(source);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal, cache: 'no-store',
      headers: {
        'User-Agent': '16-Bit Weather RSS Aggregator/1.0 (https://16bitweather.co)',
        Accept: source.format === 'json' ? 'application/json' : 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > 5_000_000) throw new Error('Feed exceeds the document size limit');
    const parsed = parseFeedDocument(text, source);
    const age = Number(response.headers?.get('age') ?? 0);
    if ((Number.isFinite(age) && age * 1000 > sourcePolicy(source).freshMs) ||
        (parsed.generatedAt && Date.now() - Date.parse(parsed.generatedAt) > sourcePolicy(source).freshMs)) {
      throw new Error('Provider snapshot is stale');
    }
    if (Number.isFinite(age) && age > 0) {
      parsed.generatedAt = new Date(Math.min(Date.now() - age * 1000,
        parsed.generatedAt ? Date.parse(parsed.generatedAt) : Infinity)).toISOString();
    }
    return parsed;
  } finally { clearTimeout(timeout); }
}

async function refresh(source: FeedSource, key: string): Promise<void> {
  const policy = sourcePolicy(source);
  const prior = snapshots.get(key)?.result;
  const attemptedAt = new Date().toISOString();
  try {
    const parsed = await retrieve(source);
    if (!parsed.items.length && (parsed.rejected || parsed.issues.length || parsed.truncated)) throw new Error('No usable records in incomplete feed');
    const checkedAt = new Date().toISOString();
    const times = parsed.items.map(item => item.timestamp.getTime()).filter(time => time > 0);
    const partial = parsed.rejected > 0 || parsed.truncated || parsed.issues.length > 0;
    const freshUntil = Math.min(Date.parse(checkedAt) + policy.freshMs,
      parsed.generatedAt ? Date.parse(parsed.generatedAt) + policy.freshMs : Infinity);
    snapshots.set(key, {
      nextAttemptAt: Date.now() + policy.refreshMs,
      result: {
        items: parsed.items,
        health: {
          id: source.id, name: source.name, url: source.url, state: partial ? 'partial' : 'fresh',
          lastAttemptAt: attemptedAt, lastSuccessAt: checkedAt,
          freshUntil: new Date(freshUntil).toISOString(), retainedUntil: new Date(Date.now() + policy.retainMs).toISOString(),
          coverage: policy.coverage, received: parsed.received, accepted: parsed.items.length, rejected: parsed.rejected,
          truncated: parsed.truncated, pages: parsed.pages,
          oldestItemAt: times.length ? new Date(Math.min(...times)).toISOString() : null,
          newestItemAt: times.length ? new Date(Math.max(...times)).toISOString() : null,
          issues: [...new Set([...parsed.issues, ...(parsed.truncated ? ['Feed results were truncated'] : [])])],
        },
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Source request failed';
    reportFeedHealth(source, reason, 'fetch-error');
    const health: NewsSourceHealth = prior ? {
      ...prior.health, state: 'delayed', lastAttemptAt: attemptedAt,
      issues: ['Latest source check failed; current coverage cannot be verified'],
    } : {
      id: source.id, name: source.name, url: source.url, state: 'unavailable',
      lastAttemptAt: attemptedAt, lastSuccessAt: null, freshUntil: null, retainedUntil: null,
      coverage: policy.coverage, received: 0, accepted: 0, rejected: 0, truncated: false, pages: 0,
      oldestItemAt: null, newestItemAt: null, issues: ['Source unavailable; no prior snapshot on this server'],
    };
    snapshots.set(key, { result: { items: prior?.items ?? [], health }, nextAttemptAt: Date.now() + 30_000 });
  }
}

/** Source snapshots preserve check times across cache reads and category requests. */
export async function fetchFeed(source: FeedSource): Promise<FeedResult> {
  const key = `${source.id}:${source.url}`;
  if (!snapshots.has(key) || Date.now() >= snapshots.get(key)!.nextAttemptAt) {
    if (!pending.has(key)) pending.set(key, refresh(source, key).finally(() => pending.delete(key)));
    await pending.get(key);
  }
  const stored = snapshots.get(key)!.result;
  const expired = !stored.health.retainedUntil || Date.now() >= Date.parse(stored.health.retainedUntil);
  const state = expired ? 'unavailable' : ['fresh', 'partial'].includes(stored.health.state) && Date.now() >= Date.parse(stored.health.freshUntil!) ? 'delayed' : stored.health.state;
  const health = { ...stored.health, state };
  return {
    health,
    items: expired ? [] : stored.items.map(item => ({
      ...item, sourceState: state, sourceCheckedAt: health.lastSuccessAt ?? undefined, freshUntil: health.freshUntil ?? undefined,
      lifecycle: item.lifecycle === 'active' && state !== 'fresh' ? 'unverified' : item.lifecycle,
    })),
  };
}

export function clearFeedSnapshots(): void { snapshots.clear(); pending.clear(); }

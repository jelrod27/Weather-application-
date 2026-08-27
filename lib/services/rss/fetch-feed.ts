/**
 * Fetch a single RSS/Atom/JSON feed and report health to Sentry.
 */

import * as Sentry from '@sentry/nextjs';
import { parseAtomFeed, parseJsonFeed, parseRSSFeed, type RSSItem } from './parse-feed';
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
export async function fetchFeed(source: FeedSource): Promise<RSSItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': '16-Bit Weather RSS Aggregator/1.0',
        'Accept': source.format === 'json'
          ? 'application/json, text/json'
          : 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
      next: { revalidate: source.refreshInterval * 60 },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();

    // Parse based on format
    if (source.format === 'atom') {
      return parseAtomFeed(text, source);
    } else if (source.format === 'json') {
      return parseJsonFeed(text, source);
    } else {
      return parseRSSFeed(text, source);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // [news] context prefix per CLAUDE.md logging convention.
    console.error(`[news] feed fetch failed: ${source.id}`, reason);
    reportFeedHealth(source, reason, 'fetch-error');
    return [];
  }
}

/**
 * 16-Bit Weather Platform - RSS News API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { aggregateFeeds, browseFeeds, getCategoryConfig, cacheControlForCategories } from '@/lib/services/rss/rssAggregator';
import { NEWS_SECTION_IDS } from '@/lib/news/sections';
import { parseFeedCategories } from '@/lib/api/query-params';
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const browseQuerySchema = z.object({
  section: z.enum(NEWS_SECTION_IDS).optional(),
  q: z.string().max(200).default(''),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export async function GET(request: NextRequest): Promise<Response> {
  return withApiRoute(request, async () => {
    try {
      const searchParams = request.nextUrl.searchParams;

      // Parse query parameters
      const categoriesParam = searchParams.get('categories');
      const maxItems = Math.max(1, Math.min(parseInt(searchParams.get('maxItems') || '50', 10) || 50, 100));
      const maxAge = Math.max(1, Math.min(parseInt(searchParams.get('maxAge') || '72', 10) || 72, 168));
      const featured = searchParams.get('featured') === 'true';

      // Parse categories
      const categories = parseFeedCategories(categoriesParam);

      if (searchParams.get('view') === 'sections') {
        const parsed = browseQuerySchema.safeParse({
          section: searchParams.get('section') ?? undefined,
          q: searchParams.get('q') ?? undefined,
          offset: searchParams.get('offset') ?? undefined,
        });
        if (!parsed.success) {
          return NextResponse.json({ error: 'Invalid news browse parameters' }, { status: 400 });
        }
        const result = await browseFeeds({
          categories, maxAge, section: parsed.data.section,
          query: parsed.data.q, offset: parsed.data.offset,
        });
        return NextResponse.json({ status: 'ok', ...result }, { headers: { 'Cache-Control': 'no-store' } });
      }

      // Aggregate feeds — single payload includes rails for the page client.
      const result = await aggregateFeeds({
        categories,
        maxItems: Math.min(maxItems, 100), // Cap at 100
        maxAge: Math.min(maxAge, 168), // Cap at 1 week
      });

      return NextResponse.json({
        status: 'ok',
        ...(!featured ? { items: result.items, happeningNow: result.happeningNow, delayedItems: result.delayedItems } : {}),
        featured: result.featured,
        sources: result.sources,
        stats: result.stats,
        lastUpdated: result.lastUpdated.toISOString(),
        categories: getCategoryConfig(),
      }, {
        headers: {
          // Source snapshots are cached; lifecycle-bearing responses are not.
          'Cache-Control': cacheControlForCategories(categories),
        },
      });
    } catch (error) {
      // Keep the detailed error server-side only; do not leak upstream internals
      // (feed URLs, parser errors) to the client.
      logRouteError('news/rss', error);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to fetch news',
          items: [],
        },
        { status: 500 }
      );
    }
  }, { rateLimitBucket: 'content' })
}

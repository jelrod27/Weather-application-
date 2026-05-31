/**
 * 16-Bit Weather Platform - RSS News API Route
 *
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 */

import { NextRequest, NextResponse } from 'next/server';
import { aggregateFeeds, getFeaturedItem, getCategoryConfig, cacheControlForCategories } from '@/lib/services/rss/rssAggregator';
import type { FeedCategory } from '@/lib/services/rss/feedSources';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const categoriesParam = searchParams.get('categories');
    const maxItems = Math.max(1, Math.min(parseInt(searchParams.get('maxItems') || '50', 10) || 50, 100));
    const maxAge = Math.max(1, Math.min(parseInt(searchParams.get('maxAge') || '72', 10) || 72, 168));
    const featured = searchParams.get('featured') === 'true';

    // Parse categories
    let categories: FeedCategory[] | undefined;
    if (categoriesParam) {
      categories = categoriesParam.split(',').filter(Boolean) as FeedCategory[];
    }

    // Return featured item if requested
    if (featured) {
      const featuredItem = await getFeaturedItem();
      return NextResponse.json({
        status: 'ok',
        featured: featuredItem,
        categories: getCategoryConfig(),
      });
    }

    // Aggregate feeds
    const result = await aggregateFeeds({
      categories,
      maxItems: Math.min(maxItems, 100), // Cap at 100
      maxAge: Math.min(maxAge, 168), // Cap at 1 week
    });

    return NextResponse.json({
      status: 'ok',
      items: result.items,
      stats: result.stats,
      lastUpdated: result.lastUpdated.toISOString(),
      categories: getCategoryConfig(),
    }, {
      headers: {
        // Tiered by requested categories (PRD §9): the "all"/mixed request
        // resolves to the Fast tier so severe alerts stay near real-time.
        'Cache-Control': cacheControlForCategories(categories),
      },
    });
  } catch (error) {
    // Keep the detailed error server-side only; do not leak upstream internals
    // (feed URLs, parser errors) to the client.
    console.error('RSS aggregation error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch news',
        items: [],
      },
      { status: 500 }
    );
  }
}

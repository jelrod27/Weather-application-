/**
 * 16-Bit Weather Platform - News API Route v0.3.32
 * 
 * Copyright (C) 2025 16-Bit Weather
 * Licensed under Fair Source License, Version 0.9
 * 
 * Server-side proxy for NewsAPI with rate limiting and caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeLogValue } from "@/lib/sanitize-log";
import { tileProxyOriginHeaders } from "@/lib/services/tile-proxy-cors";

// Cache configuration - Increased to reduce API calls
const CACHE_DURATION = 15 * 60; // 15 minutes
const STALE_WHILE_REVALIDATE = 86400; // 24 hours

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max requests per minute per client

// In-memory rate limit store (consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// NewsAPI configuration - Server-side only
const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
const NEWS_API_URL = 'https://newsapi.org/v2';

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime + RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const limit = rateLimitStore.get(identifier);

  if (!limit || now > limit.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { 
      allowed: true, 
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetTime: now + RATE_LIMIT_WINDOW
    };
  }

  if (limit.count >= MAX_REQUESTS_PER_WINDOW) {
    return { 
      allowed: false, 
      remaining: 0,
      resetTime: limit.resetTime
    };
  }

  limit.count++;
  return { 
    allowed: true, 
    remaining: MAX_REQUESTS_PER_WINDOW - limit.count,
    resetTime: limit.resetTime
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get client identifier for rate limiting
    // Prefer x-real-ip (set by Vercel/reverse proxy, harder to spoof) over x-forwarded-for.
    // Revisit this if the deployment platform changes.
    const realIp = request.headers.get('x-real-ip');
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientId = realIp?.trim() || forwardedFor?.split(',')[0]?.trim() || 'default';

    // Check rate limit
    const rateLimit = checkRateLimit(clientId);
    
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);

      return NextResponse.json(
        { 
          status: 'error',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please wait before trying again.',
          articles: [],
          totalResults: 0,
          retryAfter: retryAfter
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimit.resetTime),
            'Cache-Control': 'no-store'
          }
        }
      );
    }

    // Parse query parameters.
    // SECURITY: every value below is concatenated into the upstream NewsAPI URL.
    // searchParams.get() returns a URL-decoded string, so any value that is not
    // strictly validated/encoded here would allow HTTP parameter injection
    // (e.g. country=us%26apiKey%3D... splicing extra query params into the
    // upstream request). Allowlist enums, clamp numerics, encode free text.
    const { searchParams } = new URL(request.url);

    const ALLOWED_ENDPOINTS = ['top-headlines', 'everything'] as const;
    const ALLOWED_CATEGORIES = ['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'] as const;
    const ISO2_RE = /^[a-z]{2}$/i;

    const endpointParam = searchParams.get('endpoint') || 'top-headlines';
    const endpoint = (ALLOWED_ENDPOINTS as readonly string[]).includes(endpointParam)
      ? endpointParam
      : 'top-headlines';

    const categoryParam = searchParams.get('category') || '';
    const category = (ALLOWED_CATEGORIES as readonly string[]).includes(categoryParam)
      ? categoryParam
      : '';

    const q = searchParams.get('q') || '';

    const countryParam = searchParams.get('country') || 'us';
    const country = ISO2_RE.test(countryParam) ? countryParam.toLowerCase() : 'us';

    const domains = searchParams.get('domains') || '';

    const languageParam = searchParams.get('language') || 'en';
    const language = ISO2_RE.test(languageParam) ? languageParam.toLowerCase() : 'en';

    const pageSizeParam = parseInt(searchParams.get('pageSize') || '10', 10);
    const pageSize = String(Math.max(1, Math.min(Number.isFinite(pageSizeParam) ? pageSizeParam : 10, 100)));

    // Check if API key is configured
    if (!NEWS_API_KEY || NEWS_API_KEY === 'your_actual_news_api_key_here') {
      console.warn('[NEWS API] NEWS_API_KEY not configured properly');
      return NextResponse.json(
        { 
          status: 'ok',
          source: 'cache',
          message: 'News service configuration pending',
          articles: [],
          totalResults: 0
        },
        { 
          status: 200,
          headers: {
            'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
            'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-News-Source': 'fallback'
          }
        }
      );
    }

    // Build NewsAPI URL
    let apiUrl = `${NEWS_API_URL}/${endpoint}?`;
    
    if (endpoint === 'everything') {
      // For search queries
      if (q) apiUrl += `q=${encodeURIComponent(q)}&`;
      if (domains) apiUrl += `domains=${domains.replace(/[^a-zA-Z0-9.,-]/g, '')}&`;
      apiUrl += `language=${language}&`;
      apiUrl += `sortBy=publishedAt&`;
    } else {
      // For top headlines
      apiUrl += `country=${country}&`;
      if (category && category !== 'all') {
        apiUrl += `category=${category}&`;
      }
      if (q) apiUrl += `q=${encodeURIComponent(q)}&`;
    }
    
    apiUrl += `pageSize=${pageSize}&apiKey=${NEWS_API_KEY}`;

    // Fetch from NewsAPI with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': '16BitWeather/1.0'
      },
      signal: controller.signal,
      next: { revalidate: CACHE_DURATION }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[NEWS API] Error: ${response.status} ${sanitizeLogValue(response.statusText)}`);
      
      // Handle specific NewsAPI errors gracefully
      if (response.status === 426) {
        // Upgrade required (paid plan needed)
        return NextResponse.json(
          { 
            status: 'ok',
            source: 'limited',
            message: 'Premium news features not available',
            articles: [],
            totalResults: 0
          },
          { 
            status: 200,
            headers: {
              'Cache-Control': `public, s-maxage=${CACHE_DURATION * 4}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
              'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
              'X-RateLimit-Remaining': String(rateLimit.remaining),
              'X-News-Source': 'limited'
            }
          }
        );
      }
      
      if (response.status === 429) {
        // NewsAPI rate limit
        return NextResponse.json(
          { 
            status: 'ok',
            source: 'cached',
            message: 'News temporarily limited - using cached data',
            articles: [],
            totalResults: 0
          },
          { 
            status: 200,
            headers: {
              'Cache-Control': `public, s-maxage=${CACHE_DURATION * 6}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
              'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
              'X-RateLimit-Remaining': String(rateLimit.remaining),
              'X-News-Source': 'cached'
            }
          }
        );
      }
      
      // Other errors
      throw new Error(`NewsAPI returned ${response.status}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    // Success response with proper caching
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
        'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetTime),
        'X-News-Source': 'newsapi',
        'X-Response-Time': String(responseTime)
      },
    });

  } catch (error: unknown) {
    const errorTime = Date.now() - startTime;
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[NEWS API] Request timeout after ${errorTime}ms`);
    } else if (error instanceof Error) {
      console.error(`[NEWS API] Error after ${errorTime}ms:`, sanitizeLogValue(error.message));
    } else {
      console.error(`[NEWS API] Unknown error after ${errorTime}ms:`, error instanceof Error ? error.message : sanitizeLogValue(error));
    }
    
    // Always return graceful degradation to prevent UI breaks
    return NextResponse.json(
      { 
        status: 'ok',
        source: 'fallback',
        message: 'News temporarily unavailable',
        articles: [],
        totalResults: 0
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_DURATION * 2}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
          'X-News-Source': 'fallback',
          'X-Response-Time': String(errorTime)
        }
      }
    );
  }
}

// CORS preflight — restricted to the app origin + *.vercel.app preview deploys
// (was previously '*', letting any site use this as a free news proxy).
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...tileProxyOriginHeaders(request),
      'Access-Control-Max-Age': '86400',
    },
  });
}
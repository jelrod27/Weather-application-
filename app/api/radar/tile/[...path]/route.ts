import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createTtlCache } from '@/lib/cache/ttl-cache'
import { logRouteError } from '@/lib/error-utils'

const RAINVIEWER_TILE_HOST = 'https://tilecache.rainviewer.com'
const TILE_CACHE_TTL_MS = 10 * 60 * 1000
const TILE_STALE_TTL_MS = 60 * 60 * 1000
const TILE_FETCH_TIMEOUT_MS = 8000
const MAX_TILE_CACHE_ENTRIES = 512

/** Allowed RainViewer tile paths — blocks open proxy abuse. */
const TILE_PATH =
  /^v2\/(?:radar\/[a-f0-9]+\/(256|512)\/\d+\/\d+\/\d+\/\d+\/[01]_[01]\.png|coverage\/0\/(256|512)\/\d+\/\d+\/\d+\/0\/0_0\.png)$/

interface CachedTile {
  body: ArrayBuffer
  contentType: string
}

// The stale window and the size bound are the cache's own concerns; the route
// only decides when a stale tile is acceptable.
const tileCache = createTtlCache<CachedTile>({
  ttlMs: TILE_CACHE_TTL_MS,
  staleMs: TILE_STALE_TTL_MS - TILE_CACHE_TTL_MS,
  maxEntries: MAX_TILE_CACHE_ENTRIES,
})

function tileResponse(body: ArrayBuffer, contentType: string, cacheControl: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    },
  })
}

async function fetchTileFromRainViewer(joined: string): Promise<CachedTile> {
  const upstream = `${RAINVIEWER_TILE_HOST}/${joined}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TILE_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(upstream, {
      signal: controller.signal,
      headers: { Accept: 'image/png,image/*' },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      // Deliberately does NOT return a stale tile here. cache.load() stores
      // whatever the loader resolves to, which would re-stamp the old bytes as
      // freshly fetched and let a persistently 429ing tile stay "fresh" forever,
      // past the stale ceiling. Throwing hands the stale fallback to the GET
      // handler's catch, which serves it via getStale (no re-stamp) with the
      // weaker cache-control it deserves.
      throw new Error(`RainViewer tile fetch failed: ${response.status}`)
    }

    return {
      body: await response.arrayBuffer(),
      contentType: response.headers.get('content-type') ?? 'image/png',
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params
    const joined = path.join('/')

    if (!TILE_PATH.test(joined)) {
      return NextResponse.json({ error: 'Invalid radar tile path' }, { status: 400 })
    }

    try {
      // Serves a fresh tile, or coalesces concurrent misses into one upstream
      // fetch and stores the result.
      const { body, contentType } = await tileCache.load(joined, () =>
        fetchTileFromRainViewer(joined),
      )
      return tileResponse(body, contentType, 'public, max-age=300, s-maxage=600, stale-while-revalidate=120')
    } catch (error) {
      const stale = tileCache.getStale(joined)
      if (stale) {
        return tileResponse(stale.body, stale.contentType, 'public, max-age=60, stale-while-revalidate=300')
      }
      logRouteError('radar-tile', error, { tile: joined })
      return NextResponse.json({ error: 'Failed to fetch radar tile' }, { status: 502 })
    }
  } catch (error) {
    logRouteError('radar-tile', error)
    return NextResponse.json({ error: 'Failed to process radar tile request' }, { status: 500 })
  }
}

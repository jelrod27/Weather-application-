import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const RAINVIEWER_TILE_HOST = 'https://tilecache.rainviewer.com'
const TILE_CACHE_TTL_MS = 10 * 60 * 1000
const TILE_STALE_TTL_MS = 60 * 60 * 1000
const TILE_FETCH_TIMEOUT_MS = 8000

/** Allowed RainViewer tile paths — blocks open proxy abuse. */
const TILE_PATH =
  /^v2\/(?:radar\/[a-f0-9]+\/(256|512)\/\d+\/\d+\/\d+\/\d+\/[01]_[01]\.png|coverage\/0\/(256|512)\/\d+\/\d+\/\d+\/0\/0_0\.png)$/

const tileCache = new Map<string, { body: ArrayBuffer; contentType: string; expires: number; fetchedAt: number }>()
const inFlightFetches = new Map<string, Promise<{ body: ArrayBuffer; contentType: string }>>()

function tileResponse(body: ArrayBuffer, contentType: string, cacheControl: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    },
  })
}

function getCachedTile(joined: string, allowStale: boolean) {
  const cached = tileCache.get(joined)
  if (!cached) return null
  if (cached.expires > Date.now()) return cached
  if (allowStale && Date.now() - cached.fetchedAt < TILE_STALE_TTL_MS) return cached
  return null
}

async function fetchTileFromRainViewer(joined: string): Promise<{ body: ArrayBuffer; contentType: string }> {
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
      const stale = getCachedTile(joined, true)
      if (response.status === 429 && stale) {
        return { body: stale.body, contentType: stale.contentType }
      }
      throw new Error(`RainViewer tile fetch failed: ${response.status}`)
    }

    const body = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') ?? 'image/png'

    tileCache.set(joined, {
      body,
      contentType,
      expires: Date.now() + TILE_CACHE_TTL_MS,
      fetchedAt: Date.now(),
    })

    return { body, contentType }
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params
  const joined = path.join('/')

  if (!TILE_PATH.test(joined)) {
    return NextResponse.json({ error: 'Invalid radar tile path' }, { status: 400 })
  }

  const fresh = getCachedTile(joined, false)
  if (fresh) {
    return tileResponse(fresh.body, fresh.contentType, 'public, max-age=300, s-maxage=600, stale-while-revalidate=120')
  }

  let pending = inFlightFetches.get(joined)
  if (!pending) {
    pending = fetchTileFromRainViewer(joined).finally(() => {
      inFlightFetches.delete(joined)
    })
    inFlightFetches.set(joined, pending)
  }

  try {
    const { body, contentType } = await pending
    return tileResponse(body, contentType, 'public, max-age=300, s-maxage=600, stale-while-revalidate=120')
  } catch (error) {
    const stale = getCachedTile(joined, true)
    if (stale) {
      return tileResponse(stale.body, stale.contentType, 'public, max-age=60, stale-while-revalidate=300')
    }
    console.error('[radar-tile]', joined, error)
    return NextResponse.json({ error: 'Failed to fetch radar tile' }, { status: 502 })
  }
}

export function clearRadarTileCacheForTests(): void {
  tileCache.clear()
  inFlightFetches.clear()
}

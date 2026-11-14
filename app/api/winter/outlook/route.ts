import { NextResponse } from 'next/server'
import { withApiRoute } from '@/lib/api/with-api-route'
import { fetchWinterOutlook, winterOutlookCacheSeconds, winterSelectionSchema } from '@/lib/winter/outlooks'
import { logRouteError } from '@/lib/error-utils'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    const parsed = winterSelectionSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!parsed.success) return NextResponse.json({ error: 'Choose a valid winter product, day (1–3), and snowfall threshold (4, 8, or 12 inches).' }, { status: 400, headers: rateLimitHeaders })
    try {
      const data = await fetchWinterOutlook(parsed.data)
      const cacheSeconds = winterOutlookCacheSeconds(data)
      return NextResponse.json(data, { headers: {
        ...rateLimitHeaders, 'Cache-Control': cacheSeconds > 0 ? `public, s-maxage=${cacheSeconds}` : 'no-store',
      } })
    } catch (error) {
      logRouteError('winter/outlook', error)
      return NextResponse.json({ error: 'The official winter outlook is unavailable. Please retry later.' }, {
        status: 502, headers: { ...rateLimitHeaders, 'Cache-Control': 'no-store' },
      })
    }
  }, { context: 'winter/outlook' })
}

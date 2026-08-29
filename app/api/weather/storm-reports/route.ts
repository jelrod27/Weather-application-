/**
 * Recent SPC storm reports (CSV) for map overlays — public, cached.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { fetchRecentSpcReports } from '@/lib/services/spc-storm-reports-service'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
  try {
    const raw = request.nextUrl.searchParams.get('days')
    const days = Math.min(7, Math.max(1, parseInt(raw ?? '2', 10) || 2))
    const reports = await fetchRecentSpcReports(days)
    return NextResponse.json(
      { reports, total: reports.length, days },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120',
          ...rateLimitHeaders,
        },
      }
    )
  } catch (error) {
    logRouteError('storm-reports API', error)
    return NextResponse.json({ error: 'Failed to fetch storm reports' }, { status: 500 })
  }
  }, { context: 'storm-reports API' })
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withApiRoute } from '@/lib/api/with-api-route'
import { fetchLocalWinterForecast } from '@/lib/winter/local-forecast'
import type { NextRequest } from 'next/server'

const coordinate = z.string().max(24).regex(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/).transform(Number).pipe(z.number().finite())
const querySchema = z.object({ lat: coordinate.pipe(z.number().min(-90).max(90)), lon: coordinate.pipe(z.number().min(-180).max(180)) })

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    const params = request.nextUrl.searchParams
    const parsed = querySchema.safeParse({ lat: params.get('lat'), lon: params.get('lon') })
    const headers = { ...rateLimitHeaders, 'Cache-Control': 'no-store' }
    if (!parsed.success || params.getAll('lat').length !== 1 || params.getAll('lon').length !== 1) {
      return NextResponse.json({ error: 'Valid latitude and longitude are required.' }, { status: 400, headers })
    }
    const forecast = await fetchLocalWinterForecast(parsed.data.lat, parsed.data.lon)
    return NextResponse.json(forecast, { status: forecast.status === 'unavailable' ? 502 : 200, headers })
  }, { context: 'winter/forecast', errorMessage: 'The official local winter forecast is unavailable.', errorStatus: 502 })
}

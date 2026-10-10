import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withApiRoute, ApiError } from '@/lib/api/with-api-route'
import { fetchOpenMeteoSky } from '@/lib/open-meteo'
import { readSkyEstimate } from '@/lib/sky/estimate'
import type { NextRequest } from 'next/server'

const decimal = z.string().regex(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/).transform(Number)
const coordinates = z.object({ lat: decimal.pipe(z.number().min(-90).max(90)), lon: decimal.pipe(z.number().min(-180).max(180)) })

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    const input = coordinates.safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!input.success) throw new ApiError(400, 'A valid latitude and longitude are required')
    const { lat, lon } = input.data
    const { body, providerReceivedAt } = await fetchOpenMeteoSky(lat, lon)
    const estimate = readSkyEstimate(body, Date.now(), providerReceivedAt)
    if (!estimate) throw new ApiError(502, 'Current sky estimate unavailable')
    return NextResponse.json(estimate, { headers: { ...rateLimitHeaders, 'Cache-Control': 'no-store' } })
  }, { context: 'Read your sky', rateLimitBucket: 'content', errorStatus: 502, errorMessage: 'Current sky estimate unavailable' })
}

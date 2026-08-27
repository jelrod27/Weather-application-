import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/push/vapid'
import { withApiRoute } from '@/lib/api/with-api-route'

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    const key = getVapidPublicKey()
    if (!key) {
      return NextResponse.json({ error: 'Web push is not configured' }, { status: 404, headers: rateLimitHeaders })
    }
    return NextResponse.json({ publicKey: key }, { headers: rateLimitHeaders })
  }, { context: 'vapid-public' })
}

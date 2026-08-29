import * as Sentry from '@sentry/nextjs'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return withApiRoute(request, async () => {
    try {
      const error = new Error('Sentry verification error from /api/test-sentry-error')
      Sentry.captureException(error)
      return NextResponse.json({ message: 'Server error sent to Sentry' })
    } catch (error) {
      logRouteError('test-sentry-error', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, { context: 'test-sentry-error' })
}

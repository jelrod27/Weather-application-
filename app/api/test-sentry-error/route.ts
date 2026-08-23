import * as Sentry from '@sentry/nextjs'
import { logRouteError } from '@/lib/error-utils'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const error = new Error('Sentry verification error from /api/test-sentry-error')
    Sentry.captureException(error)
    return Response.json({ message: 'Server error sent to Sentry' })
  } catch (error) {
    logRouteError('test-sentry-error', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

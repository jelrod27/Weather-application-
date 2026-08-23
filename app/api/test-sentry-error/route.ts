import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const error = new Error('Sentry verification error from /api/test-sentry-error')
  Sentry.captureException(error)
  return Response.json({ message: 'Server error sent to Sentry' })
}

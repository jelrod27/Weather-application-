import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'
import { verifyCronBearer } from '@/lib/cron/verify-cron-auth'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return withApiRoute(request, async () => {
    try {
      const auth = verifyCronBearer(request)
      if (!auth.ok) {
        return NextResponse.json({ error: auth.message }, { status: auth.status })
      }

      const supabase = createServiceRoleSupabaseClient()
      if (!supabase) {
        return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
      }

      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)

      if (error) {
        logRouteError('cron/keep-alive', error, { stage: 'database-ping' })
        return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
      }

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Database is alive',
      })
    } catch (error) {
      logRouteError('cron/keep-alive', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, { rateLimit: false, context: 'cron/keep-alive' })
}

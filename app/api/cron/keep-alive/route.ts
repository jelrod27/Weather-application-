import type { NextRequest } from 'next/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'
import { verifyCronBearer } from '@/lib/cron/verify-cron-auth'
import { logRouteError } from '@/lib/error-utils'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = verifyCronBearer(request)
    if (!auth.ok) {
      return Response.json({ error: auth.message }, { status: auth.status })
    }

    const supabase = createServiceRoleSupabaseClient()
    if (!supabase) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (error) {
      logRouteError('cron/keep-alive', error, { stage: 'database-ping' })
      return Response.json({ error: 'Service unavailable' }, { status: 503 })
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Database is alive',
    })
  } catch (error) {
    logRouteError('cron/keep-alive', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

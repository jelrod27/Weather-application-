import type { NextRequest } from 'next/server'
import { verifyCronBearer } from '@/lib/cron/verify-cron-auth'
import { runSevereAlertMonitor } from '@/lib/services/severe-alert-monitor'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const auth = verifyCronBearer(request)
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status })
  }

  const supabase = createServiceRoleSupabaseClient()
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const result = await runSevereAlertMonitor(supabase)

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (error) {
    console.error('[cron/severe-alerts] unhandled error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

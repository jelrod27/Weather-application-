import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parseUserAlerts } from '@/lib/services/user-alerts-utils'
import { logRouteError } from '@/lib/error-utils'
import { withApiRoute } from '@/lib/api/with-api-route'

const patchSchema = z
  .object({
    ids: z.array(z.string().uuid()).optional(),
    markAllRead: z.boolean().optional(),
  })
  .refine((value) => (value.ids?.length ?? 0) > 0 || value.markAllRead === true, {
    message: 'Provide ids or markAllRead',
  })

export async function GET(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    try {
      const supabase = await createServerSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const unreadOnly = request.nextUrl.searchParams.get('unread') === '1'
      const limit = Math.min(
        50,
        Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10) || 20),
      )

      let query = supabase
        .from('user_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (unreadOnly) {
        query = query.is('read_at', null)
      }

      const { data, error } = await query

      if (error) {
        logRouteError('user/alerts', error, { stage: 'fetch' })
        return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
      }

      const alerts = parseUserAlerts(data ?? [])
      const unreadCount = alerts.filter((a) => !a.readAt).length

      return NextResponse.json({ alerts, unreadCount })
    } catch (error) {
      logRouteError('user/alerts', error)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }
  }, { rateLimitBucket: 'account' })
}

export async function PATCH(request: NextRequest) {
  return withApiRoute(request, async ({ rateLimitHeaders }) => {
    try {
      const supabase = await createServerSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const body = await request.json().catch(() => null)
      if (body == null) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
      }
      const parsed = patchSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
      }

      const now = new Date().toISOString()
      let query = supabase
        .from('user_alerts')
        // @ts-expect-error - supabase-js Database generic mismatch
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null)

      if (parsed.data.ids?.length) {
        query = query.in('id', parsed.data.ids)
      }

      const { error } = await query

      if (error) {
        logRouteError('user/alerts', error, { stage: 'mark-read' })
        return NextResponse.json({ error: 'Failed to update alerts' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } catch (error) {
      logRouteError('user/alerts', error)
      return NextResponse.json({ error: 'Failed to update alerts' }, { status: 500 })
    }
  }, { rateLimitBucket: 'account' })
}

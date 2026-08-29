import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { ApiError, withApiRoute } from '@/lib/api/with-api-route'
import {
  deleteGuestSubscriber,
  findGuestByManageToken,
  setGuestEnabled,
  updateGuestHazardPrefs,
} from '@/lib/services/guest-alert-subscribers'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'

const actionSchema = z.object({
  token: z.string().trim().min(16).max(400),
  action: z.enum(['pause', 'resume', 'delete', 'prefs']),
  notifyTornado: z.boolean().optional(),
  notifySevereThunderstorm: z.boolean().optional(),
  notifyFlashFlood: z.boolean().optional(),
  notifyUpgrades: z.boolean().optional(),
})

function publicSubscriber(subscriber: Awaited<ReturnType<typeof findGuestByManageToken>>) {
  if (!subscriber) return null
  return {
    locationLabel: subscriber.locationLabel,
    enabled: subscriber.enabled,
    notifyTornado: subscriber.notifyTornado,
    notifySevereThunderstorm: subscriber.notifySevereThunderstorm,
    notifyFlashFlood: subscriber.notifyFlashFlood,
    notifyUpgrades: subscriber.notifyUpgrades,
  }
}

export async function GET(request: NextRequest) {
  return withApiRoute(
    request,
    async ({ request: req }) => {
      const supabase = createServiceRoleSupabaseClient()
      if (!supabase) throw new ApiError(503, 'Alerts are not configured')
      const token = req.nextUrl.searchParams.get('token') ?? ''
      if (token.length < 16) throw new ApiError(400, 'Manage link is invalid')
      const subscriber = await findGuestByManageToken(supabase, token)
      if (!subscriber) throw new ApiError(404, 'Manage link is invalid')
      return NextResponse.json({ ok: true, subscriber: publicSubscriber(subscriber) })
    },
    { context: 'alerts/guest-manage', errorMessage: 'Could not load subscription', rateLimitBucket: 'account' },
  )
}

export async function POST(request: NextRequest) {
  return withApiRoute(
    request,
    async ({ request: req }) => {
      const supabase = createServiceRoleSupabaseClient()
      if (!supabase) throw new ApiError(503, 'Alerts are not configured')

      let json: unknown
      try {
        json = await req.json()
      } catch {
        throw new ApiError(400, 'Invalid JSON body')
      }

      const parsed = actionSchema.safeParse(json)
      if (!parsed.success) throw new ApiError(400, 'Invalid manage request')

      const subscriber = await findGuestByManageToken(supabase, parsed.data.token)
      if (!subscriber) throw new ApiError(404, 'Manage link is invalid')

      if (parsed.data.action === 'delete') {
        await deleteGuestSubscriber(supabase, subscriber.id)
        return NextResponse.json({ ok: true, status: 'deleted' })
      }

      if (parsed.data.action === 'prefs') {
        await updateGuestHazardPrefs(supabase, subscriber.id, {
          notifyTornado: parsed.data.notifyTornado ?? subscriber.notifyTornado,
          notifySevereThunderstorm:
            parsed.data.notifySevereThunderstorm ?? subscriber.notifySevereThunderstorm,
          notifyFlashFlood: parsed.data.notifyFlashFlood ?? subscriber.notifyFlashFlood,
          notifyUpgrades: parsed.data.notifyUpgrades ?? subscriber.notifyUpgrades,
        })
        return NextResponse.json({ ok: true, status: 'prefs_saved' })
      }

      await setGuestEnabled(supabase, subscriber.id, parsed.data.action === 'resume')
      return NextResponse.json({
        ok: true,
        status: parsed.data.action === 'resume' ? 'enabled' : 'paused',
      })
    },
    { context: 'alerts/guest-manage', errorMessage: 'Could not update subscription', rateLimitBucket: 'account' },
  )
}

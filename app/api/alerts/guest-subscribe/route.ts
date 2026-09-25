import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { ApiError, withApiRoute } from '@/lib/api/with-api-route'
import { upsertGuestSubscriber } from '@/lib/services/guest-alert-subscribers'
import { sendGuestManageEmail, sendGuestVerifyEmail } from '@/lib/services/guest-alert-email'
import { claimGuestEmailSlot } from '@/lib/services/guest-alert-email-limit'
import { requestIp, verifyTurnstileToken } from '@/lib/security/turnstile'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'

const bodySchema = z.object({
  email: z.string().trim().email().max(320),
  lat: z.number().gte(-90).lte(90),
  lon: z.number().gte(-180).lte(180),
  locationLabel: z.string().trim().min(1).max(200),
  turnstileToken: z.string().trim().max(4096).optional(),
  notifyTornado: z.boolean().optional(),
  notifySevereThunderstorm: z.boolean().optional(),
  notifyFlashFlood: z.boolean().optional(),
  notifyUpgrades: z.boolean().optional(),
})

const EMAIL_RESPONSE = {
  ok: true,
  status: 'email_sent',
  message: 'If this address can receive Bitwatch mail, we sent the next step.',
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

      const parsed = bodySchema.safeParse(json)
      if (!parsed.success) {
        throw new ApiError(400, 'Valid email and pin are required')
      }

      const human = await verifyTurnstileToken(parsed.data.turnstileToken, requestIp(req))
      if (!human) {
        throw new ApiError(403, 'Security check failed. Refresh and try again.')
      }

      let canSend: boolean
      try {
        canSend = await claimGuestEmailSlot(supabase, parsed.data.email)
      } catch {
        throw new ApiError(503, 'Email requests are temporarily unavailable')
      }
      // Identical response prevents exposing subscription state or quota. Do
      // not rotate a pending verification/manage token when mail is suppressed.
      if (!canSend) return NextResponse.json(EMAIL_RESPONSE)

      const result = await upsertGuestSubscriber(supabase, {
        email: parsed.data.email,
        latitude: parsed.data.lat,
        longitude: parsed.data.lon,
        locationLabel: parsed.data.locationLabel,
        notifyTornado: parsed.data.notifyTornado,
        notifySevereThunderstorm: parsed.data.notifySevereThunderstorm,
        notifyFlashFlood: parsed.data.notifyFlashFlood,
        notifyUpgrades: parsed.data.notifyUpgrades,
      })

      if (result.alreadyVerified && result.manageToken) {
        const emailResult = await sendGuestManageEmail({
          email: result.subscriber.email,
          locationLabel: result.subscriber.locationLabel,
          manageToken: result.manageToken,
        })
        if (!emailResult.sent) {
          throw new ApiError(502, emailResult.reason ?? 'Could not send manage email')
        }
        return NextResponse.json(EMAIL_RESPONSE)
      }

      if (!result.verifyToken) {
        throw new ApiError(500, 'Could not create verification token')
      }

      const emailResult = await sendGuestVerifyEmail({
        email: result.subscriber.email,
        locationLabel: result.subscriber.locationLabel,
        verifyToken: result.verifyToken,
        manageToken: result.manageToken ?? undefined,
      })
      if (!emailResult.sent) {
        throw new ApiError(502, emailResult.reason ?? 'Could not send verification email')
      }

      return NextResponse.json(EMAIL_RESPONSE)
    },
    { context: 'alerts/guest-subscribe', errorMessage: 'Could not subscribe', rateLimitBucket: 'account' },
  )
}

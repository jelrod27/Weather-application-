import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { notifyNewRegistration } from '@/lib/services/admin-notify-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const WEBHOOK_SECRET_HEADER = 'x-webhook-secret'

export interface SupabaseProfileWebhookPayload {
  type: string
  table: string
  schema: string
  record: {
    id: string
    email: string
    username?: string | null
    full_name?: string | null
    created_at: string
  } | null
}

export function verifyWebhookSecret(request: NextRequest, expectedSecret: string): boolean {
  const provided = request.headers.get(WEBHOOK_SECRET_HEADER) ?? ''
  const a = Buffer.from(provided)
  const b = Buffer.from(expectedSecret)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function parseProfileInsertPayload(body: unknown): NewRegistrationFromWebhook | null {
  if (body == null || typeof body !== 'object') return null

  const payload = body as SupabaseProfileWebhookPayload

  if (payload.type !== 'INSERT') return null
  if (payload.table !== 'profiles') return null
  if (!payload.record?.id || !payload.record.email) return null

  return {
    userId: payload.record.id,
    email: payload.record.email,
    username: payload.record.username ?? null,
    fullName: payload.record.full_name ?? null,
    createdAt: payload.record.created_at ?? new Date().toISOString(),
  }
}

export interface NewRegistrationFromWebhook {
  userId: string
  email: string
  username: string | null
  fullName: string | null
  createdAt: string
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhooks/new-user] SUPABASE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  if (!verifyWebhookSecret(request, webhookSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const registration = parseProfileInsertPayload(body)
  if (!registration) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Not a profiles INSERT event' })
  }

  try {
    const results = await notifyNewRegistration(registration)

    const anySent = results.email.sent || results.slack.sent || results.discord.sent
    if (!anySent) {
      console.warn('[webhooks/new-user] No notification channels configured or all failed', results)
    }

    return NextResponse.json({
      ok: true,
      userId: registration.userId,
      notifications: results,
    })
  } catch (error) {
    console.error('[webhooks/new-user] Notification failed:', error)
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 })
  }
}

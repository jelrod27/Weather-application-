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

export interface NewRegistrationFromWebhook {
  userId: string
  email: string
  username: string | null
  fullName: string | null
  createdAt: string
}

export type ProfileWebhookParseResult =
  | { status: 'skip' }
  | { status: 'invalid'; message: string }
  | { status: 'ok'; registration: NewRegistrationFromWebhook }

export function verifyWebhookSecret(request: NextRequest, expectedSecret: string): boolean {
  const provided = request.headers.get(WEBHOOK_SECRET_HEADER) ?? ''
  const a = Buffer.from(provided)
  const b = Buffer.from(expectedSecret)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function parseProfileInsertPayload(body: unknown): ProfileWebhookParseResult {
  if (body == null || typeof body !== 'object') {
    return { status: 'invalid', message: 'Webhook body must be a JSON object' }
  }

  const payload = body as SupabaseProfileWebhookPayload

  if (payload.type !== 'INSERT' || payload.table !== 'profiles') {
    return { status: 'skip' }
  }

  const record = payload.record
  if (!record?.id || !record.email || !record.created_at) {
    return {
      status: 'invalid',
      message: 'profiles INSERT payload missing required record.id, record.email, or record.created_at',
    }
  }

  return {
    status: 'ok',
    registration: {
      userId: record.id,
      email: record.email,
      username: record.username ?? null,
      fullName: record.full_name ?? null,
      createdAt: record.created_at,
    },
  }
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

  const parsed = parseProfileInsertPayload(body)
  if (parsed.status === 'skip') {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Not a profiles INSERT event' })
  }
  if (parsed.status === 'invalid') {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }

  try {
    const results = await notifyNewRegistration(parsed.registration)

    const anySent = results.email.sent || results.slack.sent || results.discord.sent
    if (!anySent) {
      console.warn('[webhooks/new-user] No notification channels configured or all failed', results)
    }

    return NextResponse.json({
      ok: true,
      userId: parsed.registration.userId,
      notifications: results,
    })
  } catch (error) {
    console.error('[webhooks/new-user] Notification failed:', error)
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 })
  }
}

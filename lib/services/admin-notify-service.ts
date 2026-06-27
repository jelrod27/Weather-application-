/**
 * Admin notification service for new user registrations.
 * Sends email (Resend) and optional Slack/Discord webhook messages.
 */

import { Resend } from 'resend'

export interface NewRegistrationPayload {
  userId: string
  email: string
  username: string | null
  fullName: string | null
  createdAt: string
}

const SUPABASE_AUTH_USERS_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL != null
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/project/default/auth/users`
    : 'https://supabase.com/dashboard/project/_/auth/users'

function buildRegistrationSummary(payload: NewRegistrationPayload): string {
  const lines = [
    'New user registered on 16 Bit Weather',
    '',
    `Email: ${payload.email}`,
    `User ID: ${payload.userId}`,
    `Username: ${payload.username ?? '(none)'}`,
    `Full name: ${payload.fullName ?? '(none)'}`,
    `Created: ${payload.createdAt}`,
    '',
    `Supabase Auth: ${SUPABASE_AUTH_USERS_URL}`,
  ]
  return lines.join('\n')
}

export async function sendAdminRegistrationEmail(
  payload: NewRegistrationPayload,
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  const toEmail = process.env.ADMIN_NOTIFICATION_EMAIL

  if (!apiKey || !fromEmail || !toEmail) {
    return { sent: false, reason: 'Resend or admin email env vars not configured' }
  }

  const resend = new Resend(apiKey)
  const body = buildRegistrationSummary(payload)

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `[16 Bit Weather] New signup: ${payload.email}`,
    text: body,
  })

  if (error) {
    console.error('[admin-notify] Resend error:', error)
    return { sent: false, reason: error.message }
  }

  return { sent: true }
}

export async function sendSlackRegistrationNotification(
  payload: NewRegistrationPayload,
): Promise<{ sent: boolean; reason?: string }> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    return { sent: false, reason: 'SLACK_WEBHOOK_URL not configured' }
  }

  const text = [
    '*New 16 Bit Weather signup*',
    `Email: ${payload.email}`,
    `Username: ${payload.username ?? '(none)'}`,
    `User ID: \`${payload.userId}\``,
  ].join('\n')

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const reason = `Slack webhook returned ${response.status}`
    console.error('[admin-notify]', reason)
    return { sent: false, reason }
  }

  return { sent: true }
}

export async function sendDiscordRegistrationNotification(
  payload: NewRegistrationPayload,
): Promise<{ sent: boolean; reason?: string }> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) {
    return { sent: false, reason: 'DISCORD_WEBHOOK_URL not configured' }
  }

  const content = [
    '**New 16 Bit Weather signup**',
    `Email: ${payload.email}`,
    `Username: ${payload.username ?? '(none)'}`,
    `User ID: ${payload.userId}`,
  ].join('\n')

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })

  if (!response.ok) {
    const reason = `Discord webhook returned ${response.status}`
    console.error('[admin-notify]', reason)
    return { sent: false, reason }
  }

  return { sent: true }
}

export async function notifyNewRegistration(
  payload: NewRegistrationPayload,
): Promise<{
  email: { sent: boolean; reason?: string }
  slack: { sent: boolean; reason?: string }
  discord: { sent: boolean; reason?: string }
}> {
  const [email, slack, discord] = await Promise.all([
    sendAdminRegistrationEmail(payload),
    sendSlackRegistrationNotification(payload),
    sendDiscordRegistrationNotification(payload),
  ])

  return { email, slack, discord }
}

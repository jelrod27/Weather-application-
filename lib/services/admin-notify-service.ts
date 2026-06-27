/**
 * Admin notification service for new user registrations.
 * Sends email (Resend) and optional Slack/Discord webhook messages.
 */

import { getResendFromConfig } from '@/lib/services/resend-client'

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
  const config = getResendFromConfig()
  const toEmail = process.env.ADMIN_NOTIFICATION_EMAIL

  if (!config || !toEmail) {
    return { sent: false, reason: 'Resend or admin email env vars not configured' }
  }

  try {
    const body = buildRegistrationSummary(payload)

    const { error } = await config.resend.emails.send({
      from: config.fromEmail,
      to: toEmail,
      subject: `[16 Bit Weather] New signup: ${payload.email}`,
      text: body,
    })

    if (error) {
      console.error('[admin-notify] Resend error:', error)
      return { sent: false, reason: error.message }
    }

    return { sent: true }
  } catch (error) {
    console.error('[admin-notify] Resend error:', error)
    return {
      sent: false,
      reason: error instanceof Error ? error.message : 'Resend request failed',
    }
  }
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

  try {
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
  } catch (error) {
    console.error('[admin-notify] Slack error:', error)
    return {
      sent: false,
      reason: error instanceof Error ? error.message : 'Slack request failed',
    }
  }
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

  try {
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
  } catch (error) {
    console.error('[admin-notify] Discord error:', error)
    return {
      sent: false,
      reason: error instanceof Error ? error.message : 'Discord request failed',
    }
  }
}

function settledChannelResult(
  result: PromiseSettledResult<{ sent: boolean; reason?: string }>,
  channel: string,
): { sent: boolean; reason?: string } {
  if (result.status === 'fulfilled') {
    return result.value
  }
  console.error(`[admin-notify] ${channel} error:`, result.reason)
  return {
    sent: false,
    reason: result.reason instanceof Error ? result.reason.message : `${channel} request failed`,
  }
}

export async function notifyNewRegistration(
  payload: NewRegistrationPayload,
): Promise<{
  email: { sent: boolean; reason?: string }
  slack: { sent: boolean; reason?: string }
  discord: { sent: boolean; reason?: string }
}> {
  const [email, slack, discord] = await Promise.allSettled([
    sendAdminRegistrationEmail(payload),
    sendSlackRegistrationNotification(payload),
    sendDiscordRegistrationNotification(payload),
  ])

  return {
    email: settledChannelResult(email, 'email'),
    slack: settledChannelResult(slack, 'slack'),
    discord: settledChannelResult(discord, 'discord'),
  }
}

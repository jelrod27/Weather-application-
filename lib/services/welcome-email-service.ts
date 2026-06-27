import { getResendFromConfig } from '@/lib/services/resend-client'
import {
  fetchWelcomeEmailProfile,
  markWelcomeEmailSentViaRest,
  type WelcomeEmailProfile,
} from '@/lib/services/welcome-email-db'

export interface WelcomeEmailUser {
  id: string
  email: string
  emailConfirmedAt: string | null
}

export type { WelcomeEmailProfile } from '@/lib/services/welcome-email-db'

export function isEligibleForWelcomeEmail(
  user: WelcomeEmailUser,
  profile: WelcomeEmailProfile | null,
): boolean {
  if (!profile || profile.welcomeEmailSentAt) {
    return false
  }

  if (!user.email?.trim()) {
    return false
  }

  // Wait until Supabase marks the address confirmed (OAuth users are confirmed on first login).
  return user.emailConfirmedAt != null
}

function buildWelcomeEmailContent(displayName: string, dashboardUrl: string): {
  subject: string
  text: string
  html: string
} {
  const greeting = displayName ? `Hi ${displayName},` : 'Hi there,'

  const text = [
    greeting,
    '',
    'Welcome to 16 Bit Weather — your account is confirmed and ready.',
    '',
    'Here is what to try first:',
    '- Save your first city on the dashboard',
    '- Set temperature and wind units in Preferences',
    '- Optional: add a username on your profile',
    '',
    `Open your dashboard: ${dashboardUrl}`,
    '',
    'You received this because you created a 16 Bit Weather account.',
    'https://www.16bitweather.co',
  ].join('\n')

  const html = `
    <p>${greeting}</p>
    <p>Welcome to <strong>16 Bit Weather</strong> — your account is confirmed and ready.</p>
    <p><strong>Here is what to try first:</strong></p>
    <ul>
      <li>Save your first city on the dashboard</li>
      <li>Set temperature and wind units in Preferences</li>
      <li>Optional: add a username on your profile</li>
    </ul>
    <p><a href="${dashboardUrl}">Open your dashboard</a></p>
    <p style="color:#666;font-size:12px;">You received this because you created a 16 Bit Weather account.</p>
  `.trim()

  return {
    subject: 'Welcome to 16 Bit Weather',
    text,
    html,
  }
}

export async function markWelcomeEmailSent(userId: string): Promise<boolean> {
  return markWelcomeEmailSentViaRest(userId)
}

export async function sendWelcomeEmail(payload: {
  email: string
  displayName: string
  dashboardUrl?: string
}): Promise<{ sent: boolean; reason?: string }> {
  const config = getResendFromConfig()
  if (!config) {
    return { sent: false, reason: 'Resend env vars not configured' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.16bitweather.co'
  const dashboardUrl = payload.dashboardUrl ?? `${baseUrl}/dashboard?welcome=1`
  const { subject, text, html } = buildWelcomeEmailContent(payload.displayName, dashboardUrl)

  try {
    const { error } = await config.resend.emails.send({
      from: config.fromEmail,
      to: payload.email,
      subject,
      text,
      html,
    })

    if (error) {
      console.error('[welcome-email] Resend error:', error)
      return { sent: false, reason: error.message }
    }

    return { sent: true }
  } catch (error) {
    console.error('[welcome-email] Resend error:', error)
    return {
      sent: false,
      reason: error instanceof Error ? error.message : 'Resend request failed',
    }
  }
}

export async function maybeSendWelcomeEmail(user: WelcomeEmailUser): Promise<{
  sent: boolean
  skipped: boolean
  reason?: string
}> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { sent: false, skipped: true, reason: 'SUPABASE_SERVICE_ROLE_KEY not configured' }
  }

  const profile = await fetchWelcomeEmailProfile(user.id)
  if (!profile) {
    return { sent: false, skipped: false, reason: 'Profile not found' }
  }

  if (!isEligibleForWelcomeEmail(user, profile)) {
    return {
      sent: false,
      skipped: true,
      reason: profile.welcomeEmailSentAt
        ? 'Welcome email already sent'
        : 'User not eligible (unconfirmed or missing profile)',
    }
  }

  const displayName =
    profile.username?.trim() ||
    profile.fullName?.trim() ||
    user.email.split('@')[0] ||
    ''

  const sendResult = await sendWelcomeEmail({ email: user.email, displayName })
  if (!sendResult.sent) {
    return { sent: false, skipped: false, reason: sendResult.reason }
  }

  const marked = await markWelcomeEmailSent(user.id)
  if (!marked) {
    console.warn('[welcome-email] Sent email but failed to persist welcome_email_sent_at', user.id)
  }

  return { sent: true, skipped: false }
}

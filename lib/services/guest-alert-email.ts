import { getResendFromConfig } from '@/lib/services/resend-client'

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.16bitweather.co'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendGuestVerifyEmail(input: {
  email: string
  locationLabel: string
  verifyToken: string
  manageToken?: string
}): Promise<{ sent: boolean; reason?: string }> {
  const config = getResendFromConfig()
  if (!config) return { sent: false, reason: 'Resend env vars not configured' }

  const url = `${BASE_URL}/alerts/verify?token=${encodeURIComponent(input.verifyToken)}`
  const manageUrl = input.manageToken
    ? `${BASE_URL}/alerts/manage?token=${encodeURIComponent(input.manageToken)}`
    : `${BASE_URL}/alerts`
  const subject = 'Confirm Bitwatch alerts for your pin'
  const text = [
    `Confirm Bitwatch email alerts for ${input.locationLabel} on 16-Bit Weather.`,
    '',
    `Verify this address: ${url}`,
    '',
    'You will get Tornado, Flash Flood, and Severe Thunderstorm warnings that cover this pin, plus optional upgrades.',
    'When a warning ends or no longer covers the pin, that is not an all-clear.',
    'This verify link expires in 24 hours.',
    '',
    `Manage or unsubscribe: ${manageUrl}`,
  ].join('\n')
  const html = `
    <p>Confirm Bitwatch email alerts for <strong>${escapeHtml(input.locationLabel)}</strong> on 16-Bit Weather.</p>
    <p><a href="${url}">Verify this address</a></p>
    <p style="color:#666;font-size:12px;">You will get Tornado, Flash Flood, and Severe Thunderstorm warnings that cover this pin, plus optional upgrades. When a warning ends or no longer covers the pin, that is not an all-clear. This verify link expires in 24 hours.</p>
    <p style="color:#666;font-size:12px;"><a href="${manageUrl}">Manage or unsubscribe</a></p>
  `.trim()

  try {
    const { error } = await config.resend.emails.send({
      from: config.fromEmail,
      to: input.email,
      subject,
      text,
      html,
    })
    if (error) {
      console.error('[guest-alert-email] verify Resend error:', error)
      return { sent: false, reason: error.message }
    }
    return { sent: true }
  } catch (error) {
    console.error('[guest-alert-email] verify Resend error:', error)
    return { sent: false, reason: error instanceof Error ? error.message : 'Resend request failed' }
  }
}

export async function sendGuestManageEmail(input: {
  email: string
  locationLabel: string
  manageToken: string
}): Promise<{ sent: boolean; reason?: string }> {
  const config = getResendFromConfig()
  if (!config) return { sent: false, reason: 'Resend env vars not configured' }

  const url = `${BASE_URL}/alerts/manage?token=${encodeURIComponent(input.manageToken)}`
  const subject = 'Manage your Bitwatch alert pin'
  const text = [
    `Manage Bitwatch warning alerts for ${input.locationLabel}.`,
    '',
    `Open your manage link: ${url}`,
    'Use this link to pause, change hazards, unsubscribe, or enable browser alerts.',
  ].join('\n')
  const html = `
    <p>Manage Bitwatch warning alerts for <strong>${escapeHtml(input.locationLabel)}</strong>.</p>
    <p><a href="${url}">Open manage link</a></p>
    <p style="color:#666;font-size:12px;">Pause, change hazards, unsubscribe, or enable browser alerts.</p>
  `.trim()

  try {
    const { error } = await config.resend.emails.send({
      from: config.fromEmail,
      to: input.email,
      subject,
      text,
      html,
    })
    if (error) {
      console.error('[guest-alert-email] manage Resend error:', error)
      return { sent: false, reason: error.message }
    }
    return { sent: true }
  } catch (error) {
    console.error('[guest-alert-email] manage Resend error:', error)
    return { sent: false, reason: error instanceof Error ? error.message : 'Resend request failed' }
  }
}

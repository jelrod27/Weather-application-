import { getResendFromConfig } from '@/lib/services/resend-client'
import type { SevereAlertTier, SevereWeatherAlertPayload } from '@/lib/services/severe-alert-types'
import { severeAlertTierLabel } from '@/lib/services/severe-alert-classifier'

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.16bitweather.co'

function absoluteWarningsHref(href: string): string {
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  return `${BASE_URL}${href.startsWith('/') ? href : `/${href}`}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildSevereAlertEmailContent(payload: SevereWeatherAlertPayload): {
  subject: string
  text: string
  html: string
} {
  const warningsUrl = absoluteWarningsHref(payload.warningsHref)
  const manageUrl = absoluteWarningsHref(payload.manageHref || '/dashboard')
  const tier: SevereAlertTier = payload.tier ?? 'standard'
  const phase = payload.phase ?? 'new'
  const tierPrefix = tier === 'critical' ? '[CRITICAL] ' : tier === 'high' ? '[WARNING] ' : ''
  const upgradePrefix = phase === 'upgrade' ? '[UPGRADE] ' : ''
  const subject =
    phase === 'ended'
      ? `Warning ended — ${payload.locationName}`
      : `${upgradePrefix}${tierPrefix}${payload.event} — ${payload.locationName}`

  const instruction = payload.instruction?.trim()
  const notAllClear =
    phase === 'ended'
      ? 'This is not an all-clear. Stay alert and follow local officials, Wireless Emergency Alerts, and NOAA Weather Radio.'
      : null
  const text = [
    phase === 'ended'
      ? `Warning ended for ${payload.locationName}`
      : `${severeAlertTierLabel(tier)} — ${payload.event} for ${payload.locationName}`,
    '',
    payload.headline,
    '',
    instruction ? `Official instructions:\n${instruction}` : null,
    instruction ? '' : null,
    notAllClear,
    notAllClear ? '' : null,
    `Area: ${payload.areaDesc}`,
    `Severity: ${payload.severity} · Urgency: ${payload.urgency}`,
    `Expires: ${payload.expires}`,
    '',
    `Open the warnings command center: ${warningsUrl}`,
    '',
    'This is a supplemental heads-up. It does not replace Wireless Emergency Alerts, NOAA Weather Radio, or local officials.',
    'You received this because severe weather notifications are enabled for a Protected Place on 16-Bit Weather.',
    'Manage or unsubscribe: ' + manageUrl,
  ]
    .filter((line) => line !== null)
    .join('\n')

  const html = `
    <p><strong>${escapeHtml(phase === 'ended' ? 'Warning ended' : severeAlertTierLabel(tier))}</strong> — <strong>${escapeHtml(payload.event)}</strong> for ${escapeHtml(payload.locationName)}</p>
    <p>${escapeHtml(payload.headline)}</p>
    ${instruction ? `<p><strong>Official instructions:</strong> ${escapeHtml(instruction).replace(/\r\n|\n|\r/g, '<br />')}</p>` : ''}
    ${notAllClear ? `<p><strong>${escapeHtml(notAllClear)}</strong></p>` : ''}
    <ul>
      <li><strong>Area:</strong> ${escapeHtml(payload.areaDesc)}</li>
      <li><strong>Severity:</strong> ${escapeHtml(payload.severity)}</li>
      <li><strong>Urgency:</strong> ${escapeHtml(payload.urgency)}</li>
      <li><strong>Expires:</strong> ${escapeHtml(payload.expires)}</li>
    </ul>
    <p><a href="${warningsUrl}">Open warnings command center</a></p>
    <p style="color:#666;font-size:12px;">
      This is a supplemental heads-up. It does not replace Wireless Emergency Alerts, NOAA Weather Radio, or local officials.
      You received this because severe weather notifications are enabled for a Protected Place.
      <a href="${manageUrl}">Manage or unsubscribe</a>
    </p>
  `.trim()

  return { subject, text, html }
}

export async function sendSevereAlertEmail(input: {
  email: string
  payload: SevereWeatherAlertPayload
}): Promise<{ sent: boolean; reason?: string }> {
  const config = getResendFromConfig()
  if (!config) {
    return { sent: false, reason: 'Resend env vars not configured' }
  }

  const { subject, text, html } = buildSevereAlertEmailContent(input.payload)
  const manageUrl = absoluteWarningsHref(input.payload.manageHref || '/dashboard')

  try {
    const { error } = await config.resend.emails.send({
      from: config.fromEmail,
      to: input.email,
      subject,
      text,
      html,
      headers: {
        'List-Unsubscribe': `<${manageUrl}>`,
      },
    })

    if (error) {
      console.error('[severe-alert-email] Resend error:', error)
      return { sent: false, reason: error.message }
    }

    return { sent: true }
  } catch (error) {
    console.error('[severe-alert-email] Resend error:', error)
    return {
      sent: false,
      reason: error instanceof Error ? error.message : 'Resend request failed',
    }
  }
}

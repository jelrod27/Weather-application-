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
  const tier: SevereAlertTier = payload.tier ?? 'standard'
  const tierPrefix = tier === 'critical' ? '[CRITICAL] ' : tier === 'high' ? '[WARNING] ' : ''
  const subject = `${tierPrefix}${payload.event} — ${payload.locationName}`

  const instruction = payload.instruction?.trim()
  const text = [
    `${severeAlertTierLabel(tier)} — ${payload.event} for ${payload.locationName}`,
    '',
    payload.headline,
    '',
    instruction ? `Official instructions:\n${instruction}` : null,
    instruction ? '' : null,
    `Area: ${payload.areaDesc}`,
    `Severity: ${payload.severity} · Urgency: ${payload.urgency}`,
    `Expires: ${payload.expires}`,
    '',
    `Open the warnings command center: ${warningsUrl}`,
    '',
    'This is a supplemental heads-up. It does not replace Wireless Emergency Alerts, NOAA Weather Radio, or local officials.',
    'You received this because severe weather notifications are enabled for your saved locations on 16 Bit Weather.',
    'Manage preferences: ' + `${BASE_URL}/dashboard`,
  ]
    .filter((line) => line !== null)
    .join('\n')

  const html = `
    <p><strong>${escapeHtml(severeAlertTierLabel(tier))}</strong> — <strong>${escapeHtml(payload.event)}</strong> for ${escapeHtml(payload.locationName)}</p>
    <p>${escapeHtml(payload.headline)}</p>
    ${instruction ? `<p><strong>Official instructions:</strong> ${escapeHtml(instruction).replace(/\r\n|\n|\r/g, '<br />')}</p>` : ''}
    <ul>
      <li><strong>Area:</strong> ${escapeHtml(payload.areaDesc)}</li>
      <li><strong>Severity:</strong> ${escapeHtml(payload.severity)}</li>
      <li><strong>Urgency:</strong> ${escapeHtml(payload.urgency)}</li>
      <li><strong>Expires:</strong> ${escapeHtml(payload.expires)}</li>
    </ul>
    <p><a href="${warningsUrl}">Open warnings command center</a></p>
    <p style="color:#666;font-size:12px;">
      This is a supplemental heads-up. It does not replace Wireless Emergency Alerts, NOAA Weather Radio, or local officials.
      You received this because severe weather notifications are enabled for your saved locations.
      <a href="${BASE_URL}/dashboard">Manage preferences</a>
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

  try {
    const { error } = await config.resend.emails.send({
      from: config.fromEmail,
      to: input.email,
      subject,
      text,
      html,
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

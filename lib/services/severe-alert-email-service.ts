import { getResendFromConfig } from '@/lib/services/resend-client'
import type { SevereAlertTier, SevereWeatherAlertPayload, SevereWeatherAllClearPayload } from '@/lib/services/severe-alert-types'
import { severeAlertTierLabel } from '@/lib/services/severe-alert-classifier'

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.16bitweather.co'

function absoluteWarningsHref(href: string): string {
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  return `${BASE_URL}${href.startsWith('/') ? href : `/${href}`}`
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

  const text = [
    `${severeAlertTierLabel(tier)} — ${payload.event} for ${payload.locationName}`,
    '',
    payload.headline,
    '',
    `Area: ${payload.areaDesc}`,
    `Severity: ${payload.severity} · Urgency: ${payload.urgency}`,
    `Expires: ${payload.expires}`,
    '',
    `Open the warnings command center: ${warningsUrl}`,
    '',
    'You received this because severe weather notifications are enabled for your saved locations on 16 Bit Weather.',
    'Manage preferences: ' + `${BASE_URL}/dashboard`,
  ].join('\n')

  const html = `
    <p><strong>${severeAlertTierLabel(tier)}</strong> — <strong>${payload.event}</strong> for ${payload.locationName}</p>
    <p>${payload.headline}</p>
    <ul>
      <li><strong>Area:</strong> ${payload.areaDesc}</li>
      <li><strong>Severity:</strong> ${payload.severity}</li>
      <li><strong>Urgency:</strong> ${payload.urgency}</li>
      <li><strong>Expires:</strong> ${payload.expires}</li>
    </ul>
    <p><a href="${warningsUrl}">Open warnings command center</a></p>
    <p style="color:#666;font-size:12px;">
      You received this because severe weather notifications are enabled for your saved locations.
      <a href="${BASE_URL}/dashboard">Manage preferences</a>
    </p>
  `.trim()

  return { subject, text, html }
}

export function buildSevereAlertAllClearEmailContent(payload: SevereWeatherAllClearPayload): {
  subject: string
  text: string
  html: string
} {
  const warningsUrl = absoluteWarningsHref(payload.warningsHref)
  const subject = `All clear — ${payload.locationName}`

  const text = [
    `All clear for ${payload.locationName}`,
    '',
    'No severe weather alerts are active for this saved location right now.',
    '',
    `Open the warnings command center: ${warningsUrl}`,
    '',
    'You received this because severe weather notifications are enabled on 16 Bit Weather.',
  ].join('\n')

  const html = `
    <p><strong>All clear</strong> for ${payload.locationName}</p>
    <p>No severe weather alerts are active for this saved location right now.</p>
    <p><a href="${warningsUrl}">Open warnings command center</a></p>
    <p style="color:#666;font-size:12px;">
      You received this because severe weather notifications are enabled.
      <a href="${BASE_URL}/dashboard">Manage preferences</a>
    </p>
  `.trim()

  return { subject, text, html }
}

export async function sendSevereAlertAllClearEmail(input: {
  email: string
  payload: SevereWeatherAllClearPayload
}): Promise<{ sent: boolean; reason?: string }> {
  const config = getResendFromConfig()
  if (!config) {
    return { sent: false, reason: 'Resend env vars not configured' }
  }

  const { subject, text, html } = buildSevereAlertAllClearEmailContent(input.payload)

  try {
    const { error } = await config.resend.emails.send({
      from: config.fromEmail,
      to: input.email,
      subject,
      text,
      html,
    })

    if (error) {
      console.error('[severe-alert-email] all-clear Resend error:', error)
      return { sent: false, reason: error.message }
    }

    return { sent: true }
  } catch (error) {
    console.error('[severe-alert-email] all-clear Resend error:', error)
    return {
      sent: false,
      reason: error instanceof Error ? error.message : 'Resend request failed',
    }
  }
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

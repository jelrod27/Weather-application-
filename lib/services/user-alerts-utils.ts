import type { UserAlert } from '@/lib/supabase/types'
import type {
  SevereWeatherAlertPayload,
  SevereWeatherAllClearPayload,
} from '@/lib/services/severe-alert-types'

export type ParsedUserAlert = {
  id: string
  kind: UserAlert['kind']
  createdAt: string
  readAt: string | null
  title: string
  summary: string
  href: string
  tier?: SevereWeatherAlertPayload['tier']
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function parseUserAlert(row: UserAlert): ParsedUserAlert | null {
  const payload = asRecord(row.payload)
  if (!payload) return null

  if (row.kind === 'severe_weather_all_clear') {
    const p = payload as unknown as SevereWeatherAllClearPayload
    return {
      id: row.id,
      kind: row.kind,
      createdAt: row.created_at,
      readAt: row.read_at,
      title: 'All clear',
      summary: `${p.locationName} — no active severe alerts`,
      href: p.warningsHref?.startsWith('http')
        ? p.warningsHref
        : p.warningsHref || '/warnings',
    }
  }

  if (row.kind === 'severe_weather') {
    const p = payload as unknown as SevereWeatherAlertPayload
    return {
      id: row.id,
      kind: row.kind,
      createdAt: row.created_at,
      readAt: row.read_at,
      title: p.event,
      summary: `${p.locationName} — ${p.headline}`,
      href: p.warningsHref?.startsWith('http')
        ? p.warningsHref
        : p.warningsHref || '/warnings',
      tier: p.tier,
    }
  }

  return null
}

export function parseUserAlerts(rows: UserAlert[]): ParsedUserAlert[] {
  return rows.map(parseUserAlert).filter((row): row is ParsedUserAlert => row != null)
}

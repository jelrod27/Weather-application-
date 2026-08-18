import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { activeWarningDetails, applySourceMessage, type WarningEventRecord } from '@/lib/bitwatch/lifecycle'
import { parseVtecFromParameters } from '@/lib/bitwatch/vtec'
import type { Database, Json } from '@/lib/supabase/types'
import {
  fetchActiveAlertsDetail,
  fetchNwsAlertPages,
  harmWarningCollectionUrl,
  type NWSAlertDetail,
} from '@/lib/services/nws-alerts-service'

const INGEST_ID = 'nws-alerts'
const OVERLAP_MS = 15 * 60 * 1000
const FRESH_MS = 3 * 60 * 1000
const LEASE_MS = 50_000

export type BitwatchFreshness = 'fresh' | 'delayed' | 'unavailable'

export type IngestRunResult = {
  ok: boolean
  skipped: boolean
  messages: number
  activeEvents: number
  watermark: string | null
  error?: string
}

export function overlapStartIso(watermarkSent: string | null, nowMs: number): string | undefined {
  if (!watermarkSent) return undefined
  const t = new Date(watermarkSent).getTime()
  if (!Number.isFinite(t)) return undefined
  return new Date(t - OVERLAP_MS).toISOString()
}

export function nextWatermarkIso(current: string | null, sentTimes: string[]): string | null {
  let max = current ? new Date(current).getTime() : Number.NaN
  for (const sent of sentTimes) {
    const t = new Date(sent).getTime()
    if (!Number.isFinite(t)) continue
    if (!Number.isFinite(max) || t > max) max = t
  }
  return Number.isFinite(max) ? new Date(max).toISOString() : current
}

export function contentHash(detail: NWSAlertDetail): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        id: detail.id,
        sent: detail.sent,
        expires: detail.expires,
        description: detail.description,
        instruction: detail.instruction,
        geometry: detail.geometry,
        messageType: detail.messageType,
      }),
    )
    .digest('hex')
}

function toJson(value: unknown): Json {
  return value as Json
}

function sortBySent(details: NWSAlertDetail[]): NWSAlertDetail[] {
  return [...details].sort((a, b) => {
    const ta = new Date(a.sent).getTime()
    const tb = new Date(b.sent).getTime()
    const sa = Number.isFinite(ta) ? ta : 0
    const sb = Number.isFinite(tb) ? tb : 0
    return sa - sb
  })
}

export function foldSourceMessages(details: NWSAlertDetail[]): Map<string, WarningEventRecord> {
  let events = new Map<string, WarningEventRecord>()
  for (const detail of sortBySent(details)) {
    const vtecs = parseVtecFromParameters({ VTEC: detail.vtecRaw }, detail.description, detail.sent)
    events = applySourceMessage(events, {
      nwsId: detail.id,
      sent: detail.sent,
      capMessageType: detail.messageType,
      vtecs,
      display: detail,
    })
  }
  return events
}

export function reconcileWithActiveSnapshot(
  events: Map<string, WarningEventRecord>,
  active: NWSAlertDetail[],
  nowMs: number,
): Map<string, WarningEventRecord> {
  const activeIds = new Set(active.map((alert) => alert.warningEventId || alert.id))
  const next = new Map(events)
  for (const [id, event] of next) {
    if (event.status !== 'active') continue
    if (activeIds.has(id) || activeIds.has(event.nwsId) || active.some((a) => a.id === event.nwsId)) {
      continue
    }
    const expires = new Date(event.display.expires).getTime()
    if (Number.isFinite(expires) && expires > nowMs) continue
    next.set(id, { ...event, status: 'ended', endedReason: event.endedReason ?? 'expired' })
  }
  for (const alert of active) {
    const id = alert.warningEventId || alert.id
    const existing = next.get(id)
    if (existing?.status === 'ended') continue
    next.set(id, {
      id,
      status: 'active',
      nwsId: alert.id,
      event: alert.event,
      display: { ...alert, warningEventId: id },
      endedReason: null,
    })
  }
  return next
}

export function postgrestInList(ids: string[]): string {
  return `(${ids.map((id) => `"${id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')})`
}

type IngestStateRow = {
  watermark_sent: string | null
  last_success_at: string | null
  lease_until: string | null
}

async function claimIngestLease(
  supabase: SupabaseClient<Database>,
  state: IngestStateRow | null,
  nowMs: number,
  nowIso: string,
): Promise<{ ok: true; skipped: boolean } | { ok: false; skipped: false; error: string }> {
  const leaseUntil = new Date(nowMs + LEASE_MS).toISOString()
  const leaseFields = {
    last_error: null,
    lease_until: leaseUntil,
    updated_at: nowIso,
  }

  if (!state) {
    const { error } = await supabase.from('bitwatch_ingest_state').insert({
      id: INGEST_ID,
      watermark_sent: null,
      last_success_at: null,
      ...leaseFields,
    } as never)
    if (error?.code === '23505') return { ok: true, skipped: true }
    if (error) return { ok: false, skipped: false, error: error.message }
    return { ok: true, skipped: false }
  }

  const { data, error } = await supabase
    .from('bitwatch_ingest_state')
    .update(leaseFields as never)
    .eq('id', INGEST_ID)
    .or(`lease_until.is.null,lease_until.lte."${nowIso}"`)
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, skipped: false, error: error.message }
  if (!(data as { id?: string } | null)?.id) return { ok: true, skipped: true }
  return { ok: true, skipped: false }
}

export async function runBitwatchIngest(
  supabase: SupabaseClient<Database>,
  nowMs = Date.now(),
): Promise<IngestRunResult> {
  const nowIso = new Date(nowMs).toISOString()
  const { data: stateRow, error: stateReadError } = await supabase
    .from('bitwatch_ingest_state')
    .select('watermark_sent, last_success_at, lease_until')
    .eq('id', INGEST_ID)
    .maybeSingle()

  if (stateReadError) {
    return { ok: false, skipped: false, messages: 0, activeEvents: 0, watermark: null, error: stateReadError.message }
  }

  const state = (stateRow as IngestStateRow | null) ?? null
  const claimed = await claimIngestLease(supabase, state, nowMs, nowIso)
  if (!claimed.ok) {
    return { ok: false, skipped: false, messages: 0, activeEvents: 0, watermark: null, error: claimed.error }
  }
  if (claimed.skipped) {
    return {
      ok: true,
      skipped: true,
      messages: 0,
      activeEvents: 0,
      watermark: state?.watermark_sent ?? null,
    }
  }

  try {
    const start = overlapStartIso(state?.watermark_sent ?? null, nowMs)
    const collection = await fetchNwsAlertPages(harmWarningCollectionUrl(start))
    const active = await fetchActiveAlertsDetail()
    const folded = reconcileWithActiveSnapshot(foldSourceMessages(collection), active, nowMs)
    const activeEvents = activeWarningDetails(folded)
    const foldedIds = [...folded.keys()]

    for (const detail of collection) {
      const hash = contentHash(detail)
      const { error } = await supabase.from('bitwatch_source_messages').upsert(
        {
          nws_id: detail.id,
          sender: detail.sender,
          sent: detail.sent || nowIso,
          message_type: detail.messageType,
          event: detail.event,
          content_hash: hash,
          warning_event_id: detail.warningEventId,
          payload: toJson(detail),
          observed_at: nowIso,
        } as never,
        { onConflict: 'nws_id,sent' },
      )
      if (error && error.code !== '23505') {
        throw new Error(error.message)
      }
    }

    if (active.length > 0 && foldedIds.length > 0) {
      const { error: clearError } = await supabase
        .from('bitwatch_warning_events')
        .update({ status: 'ended', ended_reason: 'reconciled', updated_at: nowIso } as never)
        .eq('status', 'active')
        .filter('id', 'not.in', postgrestInList(foldedIds))
      if (clearError) throw new Error(clearError.message)
    }

    for (const event of folded.values()) {
      const { error } = await supabase.from('bitwatch_warning_events').upsert(
        {
          id: event.id,
          nws_id: event.nwsId,
          event: event.event,
          status: event.status,
          ended_reason: event.endedReason,
          display: toJson(event.display),
          updated_at: nowIso,
        } as never,
        { onConflict: 'id' },
      )
      if (error) throw new Error(error.message)
    }

    const watermark = nextWatermarkIso(
      state?.watermark_sent ?? null,
      collection.map((item) => item.sent),
    )

    const { error: doneError } = await supabase.from('bitwatch_ingest_state').upsert(
      {
        id: INGEST_ID,
        watermark_sent: watermark,
        last_success_at: nowIso,
        last_error: null,
        lease_until: nowIso,
        updated_at: nowIso,
      } as never,
      { onConflict: 'id' },
    )
    if (doneError) throw new Error(doneError.message)

    return {
      ok: true,
      skipped: false,
      messages: collection.length,
      activeEvents: activeEvents.length,
      watermark,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ingest failed'
    await supabase.from('bitwatch_ingest_state').upsert(
      {
        id: INGEST_ID,
        watermark_sent: state?.watermark_sent ?? null,
        last_success_at: state?.last_success_at ?? null,
        last_error: message,
        lease_until: nowIso,
        updated_at: nowIso,
      } as never,
      { onConflict: 'id' },
    )
    return {
      ok: false,
      skipped: false,
      messages: 0,
      activeEvents: 0,
      watermark: state?.watermark_sent ?? null,
      error: message,
    }
  }
}

export async function loadCanonicalActiveAlerts(
  supabase: SupabaseClient<Database>,
  nowMs = Date.now(),
): Promise<{ alerts: NWSAlertDetail[]; freshness: BitwatchFreshness; observedAt: string | null } | null> {
  const { data: state, error: stateError } = await supabase
    .from('bitwatch_ingest_state')
    .select('last_success_at, last_error')
    .eq('id', INGEST_ID)
    .maybeSingle()

  if (stateError) return null

  const successAt = (state as { last_success_at?: string | null } | null)?.last_success_at ?? null
  if (!successAt) return null
  const age = nowMs - new Date(successAt).getTime()
  if (!Number.isFinite(age)) return null

  const { data, error } = await supabase
    .from('bitwatch_warning_events')
    .select('display')
    .eq('status', 'active')

  if (error) return null

  const alerts = ((data ?? []) as Array<{ display: NWSAlertDetail }>)
    .map((row) => row.display)
    .filter((alert) => alert && typeof alert.id === 'string')

  return {
    alerts,
    freshness: age <= FRESH_MS ? 'fresh' : 'delayed',
    observedAt: successAt,
  }
}

export async function loadCanonicalAlertBySlug(
  supabase: SupabaseClient<Database>,
  slug: string,
): Promise<NWSAlertDetail | null> {
  const decoded = (() => {
    try {
      return decodeURIComponent(slug)
    } catch {
      return slug
    }
  })()

  const { data: byEventId } = await supabase
    .from('bitwatch_warning_events')
    .select('display')
    .eq('id', decoded)
    .maybeSingle()

  const fromEvent = (byEventId as { display?: NWSAlertDetail } | null)?.display
  if (fromEvent?.id) return fromEvent

  const { data: rows } = await supabase
    .from('bitwatch_warning_events')
    .select('display, nws_id')
    .order('updated_at', { ascending: false })
    .limit(500)

  const match = ((rows ?? []) as Array<{ display: NWSAlertDetail; nws_id: string }>).find((row) => {
    const alert = row.display
    if (!alert?.id) return false
    return (
      alert.id === decoded ||
      alert.id.endsWith(decoded) ||
      row.nws_id.endsWith(decoded) ||
      alert.warningEventId === decoded
    )
  })
  return match?.display ?? null
}

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Keep UUID filters comfortably within URL limits and below the API row cap.
const STATE_READ_BATCH_SIZE = 100

type MonitorKind = 'account' | 'guest'
type MonitorState = string[] | Error

/** Failed reads stay distinct from a successfully read, empty alert history. */
export async function loadMonitorStates(
  supabase: SupabaseClient<Database>,
  kind: MonitorKind,
  placeIds: readonly string[],
): Promise<Map<string, MonitorState>> {
  const table = kind === 'account' ? 'alert_monitor_state' : 'guest_alert_monitor_state'
  const idColumn = kind === 'account' ? 'subscription_id' : 'subscriber_id'
  const states = new Map<string, MonitorState>()
  const ids = [...new Set(placeIds)]

  for (let offset = 0; offset < ids.length; offset += STATE_READ_BATCH_SIZE) {
    const batch = ids.slice(offset, offset + STATE_READ_BATCH_SIZE)
    try {
      const { data, error } = await supabase
        .from(table)
        .select(`${idColumn},active_alert_ids`)
        .in(idColumn, batch)
      if (error) throw new Error(error.message)
      if (!Array.isArray(data)) throw new Error('invalid state response')

      const batchStates = new Map<string, MonitorState>(batch.map((id) => [id, []]))
      for (const row of data as unknown[]) {
        if (!row || typeof row !== 'object' || !(idColumn in row)) {
          throw new Error('invalid state row')
        }
        const fields = row as Record<string, unknown>
        const id = fields[idColumn]
        if (typeof id !== 'string' || !batchStates.has(id)) {
          throw new Error('invalid state identifier')
        }
        const activeIds = fields.active_alert_ids
        batchStates.set(id, Array.isArray(activeIds) && activeIds.every((value) => typeof value === 'string')
          ? activeIds
          : new Error('Monitor state read failed: invalid alert history'))
      }
      for (const [id, state] of batchStates) states.set(id, state)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'state query failed'
      for (const id of batch) states.set(id, new Error(`Monitor state read failed: ${message}`))
    }
  }

  return states
}

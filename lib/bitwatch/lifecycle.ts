import { isTerminalVtecAction, provisionalWarningEventId, type ParsedVtec } from '@/lib/bitwatch/vtec'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

export type WarningEventStatus = 'active' | 'ended'

export type WarningEventRecord = {
  id: string
  status: WarningEventStatus
  nwsId: string
  event: string
  display: NWSAlertDetail
  endedReason: string | null
}

export type SourceMessageInput = {
  nwsId: string
  sent: string
  capMessageType: string
  vtecs: ParsedVtec[]
  display: NWSAlertDetail
}

export function applySourceMessage(
  events: Map<string, WarningEventRecord>,
  message: SourceMessageInput,
): Map<string, WarningEventRecord> {
  const next = new Map(events)
  const vtecs = message.vtecs
  if (vtecs.length === 0) {
    applyProvisional(next, message)
    return next
  }
  for (const vtec of vtecs) {
    applyVtec(next, message, vtec)
  }
  return next
}

function applyProvisional(events: Map<string, WarningEventRecord>, message: SourceMessageInput): void {
  const id = provisionalWarningEventId(message.nwsId)
  const cap = message.capMessageType.trim().toLowerCase()
  if (cap === 'cancel') {
    const existing = events.get(id)
    events.set(id, {
      id,
      status: 'ended',
      nwsId: message.nwsId,
      event: message.display.event,
      display: { ...message.display, warningEventId: id },
      endedReason: existing?.endedReason ?? 'cancelled',
    })
    return
  }
  events.set(id, {
    id,
    status: 'active',
    nwsId: message.nwsId,
    event: message.display.event,
    display: { ...message.display, warningEventId: id },
    endedReason: null,
  })
}

function applyVtec(
  events: Map<string, WarningEventRecord>,
  message: SourceMessageInput,
  vtec: ParsedVtec,
): void {
  const id = vtec.eventId
  const display: NWSAlertDetail = {
    ...message.display,
    warningEventId: id,
    vtecAction: vtec.action,
  }
  if (isTerminalVtecAction(vtec.action)) {
    events.set(id, {
      id,
      status: 'ended',
      nwsId: message.nwsId,
      event: message.display.event,
      display,
      endedReason:
        vtec.action === 'UPG' ? 'upgraded' : vtec.action === 'CAN' ? 'cancelled' : 'expired',
    })
    return
  }
  events.set(id, {
    id,
    status: 'active',
    nwsId: message.nwsId,
    event: message.display.event,
    display,
    endedReason: null,
  })
}

export function activeWarningDetails(events: Map<string, WarningEventRecord>): NWSAlertDetail[] {
  return [...events.values()]
    .filter((event) => event.status === 'active')
    .map((event) => event.display)
}

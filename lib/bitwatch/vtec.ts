export const VTEC_ACTIONS = [
  'NEW',
  'CON',
  'EXT',
  'EXA',
  'EXB',
  'CAN',
  'UPG',
  'EXP',
  'COR',
] as const

export type VtecAction = (typeof VTEC_ACTIONS)[number]

export type ParsedVtec = {
  action: VtecAction
  office: string
  phenomenon: string
  significance: string
  etn: string
  startRaw: string
  endRaw: string
  eventId: string
}

const VTEC_RE =
  /\/O\.([A-Z]{3})\.([A-Z]{4})\.([A-Z]{2})\.([A-Z])\.(\d{4})\.(\d{6}T\d{4}Z)-(\d{6}T\d{4}Z)\//g

function isVtecAction(value: string): value is VtecAction {
  return (VTEC_ACTIONS as readonly string[]).includes(value)
}

function stringsFromUnknown(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export function originYearFromVtec(startRaw: string, sentIso: string): number {
  if (!startRaw.startsWith('000000')) {
    const yy = Number.parseInt(startRaw.slice(0, 2), 10)
    if (Number.isFinite(yy)) return 2000 + yy
  }
  const sent = new Date(sentIso)
  if (Number.isFinite(sent.getTime())) return sent.getUTCFullYear()
  return new Date().getUTCFullYear()
}

export function warningEventId(input: {
  office: string
  phenomenon: string
  significance: string
  etn: string
  originYear: number
}): string {
  return `${input.office}.${input.phenomenon}.${input.significance}.${input.etn}.${input.originYear}`
}

export function provisionalWarningEventId(nwsId: string): string {
  const trimmed = nwsId.trim()
  const tail = trimmed.includes('/alerts/') ? trimmed.slice(trimmed.lastIndexOf('/alerts/') + 8) : trimmed
  return `provisional:${tail || 'unknown'}`
}

export function parseVtecStrings(raw: string[], sentIso: string): ParsedVtec[] {
  const parsed: ParsedVtec[] = []
  for (const text of raw) {
    VTEC_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = VTEC_RE.exec(text)) !== null) {
      const action = match[1]
      if (!isVtecAction(action)) continue
      const office = match[2]
      const phenomenon = match[3]
      const significance = match[4]
      const etn = match[5]
      const startRaw = match[6]
      const endRaw = match[7]
      parsed.push({
        action,
        office,
        phenomenon,
        significance,
        etn,
        startRaw,
        endRaw,
        eventId: warningEventId({
          office,
          phenomenon,
          significance,
          etn,
          originYear: originYearFromVtec(startRaw, sentIso),
        }),
      })
    }
  }
  return parsed
}

export function parseVtecFromParameters(
  parameters: Record<string, unknown> | null | undefined,
  description: string,
  sentIso: string,
): ParsedVtec[] {
  const fromParams = stringsFromUnknown(parameters?.VTEC ?? parameters?.vtec)
  const fromDescription = description ? [description] : []
  const parsed = parseVtecStrings([...fromParams, ...fromDescription], sentIso)
  const seen = new Set<string>()
  return parsed.filter((item) => {
    const key = `${item.eventId}:${item.action}:${item.startRaw}:${item.endRaw}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function isTerminalVtecAction(action: VtecAction): boolean {
  return action === 'CAN' || action === 'EXP' || action === 'UPG'
}

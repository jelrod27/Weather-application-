'use client'

import { cn } from '@/lib/utils'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import { warningDeskScore } from '@/lib/bitwatch/priority'
import { formatWarningTimeLeft } from '@/lib/warnings/nws-parameters'

export function AlertLane({
  title,
  alerts,
  selectedId,
  onSelect,
  empty,
}: {
  title: string
  alerts: NWSAlertDetail[]
  selectedId: string | null
  onSelect: (id: string) => void
  empty: string
}) {
  return (
    <div className="space-y-2" data-testid={`warning-lane-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold font-mono uppercase tracking-wider">{title}</h3>
        <span className="text-xs text-muted-foreground font-mono">{alerts.length}</span>
      </div>
      {alerts.length === 0 ? (
        <p className="border border-border rounded-lg p-4 text-xs font-mono text-muted-foreground">
          {empty}
        </p>
      ) : (
        alerts.map((a) => (
          <button
            type="button"
            key={a.id}
            onClick={() => onSelect(a.id)}
            className={cn(
              'w-full text-left rounded-lg border p-3 font-mono text-xs transition-colors',
              a.id === selectedId
                ? 'border-amber-500/60 bg-amber-500/10'
                : 'border-border bg-card/40 hover:bg-card/70',
            )}
          >
            <div className="flex justify-between gap-2">
              <span className="font-bold text-sm">{a.event}</span>
              <span className="text-muted-foreground shrink-0">
                {warningDeskScore(a).toFixed(1)} · {formatWarningTimeLeft(a.expires)}
              </span>
            </div>
            <p className="text-muted-foreground truncate mt-1">{a.areaDesc}</p>
          </button>
        ))
      )}
    </div>
  )
}

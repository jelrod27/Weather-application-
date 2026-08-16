'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useActivePin } from '@/hooks/use-active-pin'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import { isSevereMonitorAlert } from '@/lib/services/severe-alert-filter'
import { getWarningDetailHref, warningIdSlug } from '@/lib/warnings/alert-links'
import { splitLocalWarnings } from '@/lib/warnings/local-ranking'
import { formatWarningTimeLeft } from '@/lib/warnings/nws-parameters'

const POLL_MS = 60_000
const DISMISS_PREFIX = 'warning-takeover-dismissed:'

function dismissedKey(alertId: string): string {
  return `${DISMISS_PREFIX}${alertId}`
}

function isDismissed(alertId: string): boolean {
  try {
    return sessionStorage.getItem(dismissedKey(alertId)) === '1'
  } catch {
    return false
  }
}

function dismiss(alertId: string): void {
  try {
    sessionStorage.setItem(dismissedKey(alertId), '1')
  } catch {
    // sessionStorage may be unavailable
  }
}

export default function WarningTakeover() {
  const pin = useActivePin()
  const pathname = usePathname()
  const [alerts, setAlerts] = useState<NWSAlertDetail[]>([])
  const [hiddenId, setHiddenId] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!pin) return
      try {
        const res = await fetch('/api/weather/alerts?harm=1&detail=1', { signal })
        if (!res.ok) return
        const data = (await res.json()) as { alerts?: NWSAlertDetail[] }
        if (signal?.aborted) return
        setAlerts((data.alerts ?? []).filter(isSevereMonitorAlert))
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return
        console.error('[warning-takeover]', error)
      }
    },
    [pin],
  )

  useEffect(() => {
    if (!pin) return
    const ctrl = new AbortController()
    void load(ctrl.signal)
    const timer = setInterval(() => void load(ctrl.signal), POLL_MS)
    return () => {
      ctrl.abort()
      clearInterval(timer)
    }
  }, [load, pin])

  const covering = useMemo(() => {
    if (!pin) return []
    return splitLocalWarnings(alerts, pin).onYou
  }, [alerts, pin])

  const active = covering[0] ?? null
  const onDetailPage =
    active != null && pathname?.includes(encodeURIComponent(warningIdSlug(active.id)))

  if (!active || onDetailPage || hiddenId === active.id || isDismissed(active.id)) {
    return null
  }

  return (
    <div
      role="alertdialog"
      aria-labelledby="warning-takeover-title"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
    >
      <div className="w-full max-w-2xl rounded-lg border-2 border-red-500 bg-background p-5 md:p-8 font-mono shadow-2xl">
        <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-2">
          Warning on your pin
        </p>
        <h2 id="warning-takeover-title" className="text-2xl md:text-3xl font-extrabold uppercase">
          {active.event}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{active.areaDesc}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatWarningTimeLeft(active.expires)} remaining · Expires {active.expires}
        </p>
        {active.instruction ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{active.instruction}</p>
        ) : (
          <p className="mt-4 text-sm">{active.headline}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="font-mono">
            <Link href={getWarningDetailHref(active.id)}>Open full warning</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="font-mono"
            onClick={() => {
              dismiss(active.id)
              setHiddenId(active.id)
            }}
          >
            Dismiss this warning
          </Button>
        </div>
        <p className="mt-4 text-[10px] text-muted-foreground">
          Supplemental heads-up. Does not replace Wireless Emergency Alerts, NOAA Weather Radio, or
          local officials. A new warning id will interrupt again.
        </p>
      </div>
    </div>
  )
}

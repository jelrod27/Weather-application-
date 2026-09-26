'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { findAlertByQueryParam } from '@/lib/home/hub-links'
import { selectActiveAlerts } from '@/lib/warnings/active-alerts'
import { nwsGeometryBBox } from '@/lib/warnings/alert-links'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'

interface RadarWarningResult {
  warning: NWSAlertDetail | null
  loading: boolean
  error: string | null
  retry: () => void
}

const INACTIVE_MESSAGE = 'This warning is no longer in the active feed. Check its official NWS alert for the latest status.'

export function useRadarWarning(id: string | null): RadarWarningResult {
  const [warning, setWarning] = useState<NWSAlertDetail | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    let expiryTimer: ReturnType<typeof setTimeout> | undefined
    let fetching = false
    setWarning(null)
    setError(null)
    setLoading(Boolean(id))
    if (!id) return
    const load = async () => {
      if (fetching) return
      fetching = true
      try {
        const res = await fetchWithTimeout('/api/weather/alerts?detail=1', { signal: controller.signal, cache: 'no-store', timeoutMs: 15000, maxRetries: 0 })
        if (!res.ok) throw new Error('Warning feed unavailable')
        const data = await res.json() as { alerts: NWSAlertDetail[] }
        if (controller.signal.aborted) return
        const active = selectActiveAlerts(data.alerts)
        const match = findAlertByQueryParam(active, id)
        const selected = active.find((alert) => alert.id === match) ?? null
        clearTimeout(expiryTimer)
        setWarning(selected)
        setError(!selected ? INACTIVE_MESSAGE : !nwsGeometryBBox(selected.geometry)
          ? 'The NWS has not provided a polygon for this warning. Check the official alert for its affected area.' : null)
        if (selected) {
          const endsAt = Math.min(...[selected.ends, selected.expires].map(Date.parse).filter(Number.isFinite))
          expiryTimer = setTimeout(() => { setWarning(null); setError(INACTIVE_MESSAGE) }, Math.min(endsAt - Date.now(), 2_147_483_647))
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('[RadarWarning] Could not refresh selected warning', error)
          clearTimeout(expiryTimer)
          setWarning(null)
          setError('Warning map data is unavailable. Retry or check the official NWS alert.')
        }
      } finally {
        fetching = false
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    const interval = setInterval(() => void load(), 60_000)
    return () => { controller.abort(); clearInterval(interval); clearTimeout(expiryTimer) }
  }, [id, attempt])
  return { warning, loading, error, retry }
}

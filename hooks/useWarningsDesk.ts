'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { findAlertByQueryParam } from '@/lib/home/hub-links'
import type { NWSAlertDetail, WISScore } from '@/lib/services/nws-alerts-service'
import type { SpcReport } from '@/lib/services/spc-storm-reports-service'
import type { AlertsFeatureCollection, MapPoint } from '@/components/warnings/warnings-alert-map'
import { useActivePinState } from '@/hooks/use-active-pin'
import { filterDeskAlerts, splitLocalWarnings, uniqueAlertStates, type DeskEventFilter } from '@/lib/warnings/local-ranking'

type CommunityReport = {
  id: string
  latitude: number
  longitude: number
  report_type: string
  description: string
}

export function useWarningsDesk() {
  const searchParams = useSearchParams()
  const alertFromUrl = searchParams.get('alert')
  const { pin, label: pinLabel, isResolving: pinResolving } = useActivePinState()
  const detailRef = useRef<HTMLDivElement | null>(null)
  const initialAlertAppliedRef = useRef(false)
  const initialScrollAppliedRef = useRef(false)
  const [alerts, setAlerts] = useState<NWSAlertDetail[]>([])
  const [wis, setWis] = useState<WISScore | null>(null)
  const [geoJson, setGeoJson] = useState<AlertsFeatureCollection | null>(null)
  const [spcReports, setSpcReports] = useState<SpcReport[]>([])
  const [community, setCommunity] = useState<CommunityReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState<DeskEventFilter>('all')
  const [stateFilter, setStateFilter] = useState('')
  const [freshness, setFreshness] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pointActiveKeys, setPointActiveKeys] = useState<Set<string> | undefined>(undefined)

  const load = useCallback(async (signal?: AbortSignal, silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const [dRes, gRes, sRes, cRes] = await Promise.all([
        fetch('/api/weather/alerts?detail=1', { signal, cache: 'no-store' }),
        fetch('/api/weather/alerts?geojson=1', { signal, cache: 'no-store' }),
        fetch('/api/weather/storm-reports?days=2', { signal }),
        fetch('/api/storm-reports', { signal }),
      ])
      if (!dRes.ok) throw new Error('alerts detail failed')
      const dJson = (await dRes.json()) as {
        alerts: NWSAlertDetail[]
        wis: WISScore
        freshness?: string
      }
      if (signal?.aborted) return
      setAlerts(dJson.alerts ?? [])
      setWis(dJson.wis ?? null)
      setFreshness(dJson.freshness ?? null)

      if (gRes.ok) {
        const gj = (await gRes.json()) as AlertsFeatureCollection
        if (signal?.aborted) return
        setGeoJson(gj?.type === 'FeatureCollection' ? gj : null)
      } else {
        setGeoJson(null)
      }

      if (sRes.ok) {
        const sJson = (await sRes.json()) as { reports?: SpcReport[] }
        if (signal?.aborted) return
        setSpcReports(sJson.reports ?? [])
      } else setSpcReports([])

      if (cRes.ok) {
        const cJson = (await cRes.json()) as { reports?: CommunityReport[] }
        if (signal?.aborted) return
        setCommunity(cJson.reports ?? [])
      } else setCommunity([])
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      console.error('[warnings-client]', e)
      if (!silent) setError('Could not load warnings data. Try again shortly.')
    } finally {
      if (!signal?.aborted && !silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    void load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  useEffect(() => {
    const ctrl = new AbortController()
    const t = setInterval(() => void load(ctrl.signal, true), 15_000)
    return () => {
      clearInterval(t)
      ctrl.abort()
    }
  }, [load])

  useEffect(() => {
    setPointActiveKeys(undefined)
    if (!pin) return
    const { lat, lon } = pin
    const ctrl = new AbortController()
    const run = async () => {
      try {
        const res = await fetch(
          `/api/weather/alerts?harm=1&detail=1&point=${encodeURIComponent(`${lat},${lon}`)}`,
          { cache: 'no-store', signal: ctrl.signal },
        )
        if (!res.ok) return
        const data = (await res.json()) as { alerts?: NWSAlertDetail[] }
        const keys = new Set<string>()
        for (const alert of data.alerts ?? []) {
          keys.add(alert.id)
          if (alert.warningEventId) keys.add(alert.warningEventId)
        }
        setPointActiveKeys(keys)
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return
        console.error('[warnings-client] point alerts', error)
      }
    }
    void run()
    const timer = setInterval(() => void run(), 15_000)
    return () => {
      clearInterval(timer)
      ctrl.abort()
    }
  }, [pin?.lat, pin?.lon])

  const filtered = useMemo(
    () => filterDeskAlerts(alerts, { query: search, event: eventFilter, state: stateFilter }),
    [alerts, search, eventFilter, stateFilter],
  )
  const stateOptions = useMemo(() => uniqueAlertStates(alerts), [alerts])
  const { onYou, nearby, elsewhere } = useMemo(
    () => splitLocalWarnings(filtered, pin, pointActiveKeys),
    [filtered, pin, pointActiveKeys],
  )

  const tickerAlerts = useMemo(
    () => [...onYou, ...nearby, ...elsewhere].slice(0, 12),
    [onYou, nearby, elsewhere],
  )

  const severityCounts = useMemo(() => {
    return alerts.reduce<Record<string, number>>((acc, a) => {
      acc[a.severity] = (acc[a.severity] ?? 0) + 1
      return acc
    }, {})
  }, [alerts])

  const mapPoints: MapPoint[] = useMemo(() => {
    const pts: MapPoint[] = []
    let i = 0
    for (const r of spcReports) {
      if (r.lat == null || r.lon == null) continue
      i += 1
      pts.push({
        id: `lsr-${i}-${r.date}-${r.time}`,
        lat: r.lat,
        lon: r.lon,
        label: `${r.category.toUpperCase()} · ${r.size}`,
        sub: `${r.location}, ${r.state} · ${r.date}`,
        kind: 'lsr',
      })
    }
    for (const r of community) {
      pts.push({
        id: r.id,
        lat: r.latitude,
        lon: r.longitude,
        label: r.report_type.toUpperCase(),
        sub: r.description.slice(0, 80),
        kind: 'community',
      })
    }
    return pts
  }, [spcReports, community])

  const selected = useMemo(
    () => alerts.find((a) => a.id === selectedId) ?? onYou[0] ?? nearby[0] ?? null,
    [alerts, selectedId, onYou, nearby],
  )

  useEffect(() => {
    if (!alertFromUrl || alerts.length === 0 || initialAlertAppliedRef.current) return
    const matchedId = findAlertByQueryParam(alerts, alertFromUrl)
    if (matchedId) {
      setSelectedId(matchedId)
      initialAlertAppliedRef.current = true
    }
  }, [alertFromUrl, alerts])

  useEffect(() => {
    const next = onYou[0] ?? nearby[0]
    if (!selectedId && next) setSelectedId(next.id)
  }, [onYou, nearby, selectedId])

  useEffect(() => {
    if (!selected || !initialAlertAppliedRef.current || initialScrollAppliedRef.current) return
    initialScrollAppliedRef.current = true
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selected])

  return {
    pin,
    pinLabel,
    pinResolving,
    alerts,
    wis,
    geoJson,
    loading,
    error,
    freshness,
    search,
    setSearch,
    eventFilter,
    setEventFilter,
    stateFilter,
    setStateFilter,
    stateOptions,
    onYou,
    nearby,
    elsewhere,
    tickerAlerts,
    severityCounts,
    mapPoints,
    selected,
    setSelectedId,
    detailRef,
    load,
  }
}

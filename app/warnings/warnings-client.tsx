'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ShareButtons } from '@/components/share-buttons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { findAlertByQueryParam } from '@/lib/home/hub-links'
import type { NWSAlertDetail, WISScore } from '@/lib/services/nws-alerts-service'
import type { SpcReport } from '@/lib/services/spc-storm-reports-service'
import SPCDay1RiskStrip from '@/components/warnings/spc-day1-strip'
import WarningsAlertMap, { type AlertsFeatureCollection, type MapPoint } from '@/components/warnings/warnings-alert-map'
import StormReportForm from '@/components/warnings/storm-report-form'

const SEVERITY_ORDER: Record<string, number> = {
  Extreme: 0,
  Severe: 1,
  Moderate: 2,
  Minor: 3,
}

const URGENCY_ORDER: Record<string, number> = {
  Immediate: 0,
  Expected: 1,
  Future: 2,
}

const LEVEL_COLORS: Record<string, string> = {
  green: 'text-green-400 border-green-500/40',
  yellow: 'text-yellow-400 border-yellow-500/40',
  orange: 'text-orange-400 border-orange-500/40',
  red: 'text-red-400 border-red-500/40',
}

const LEVEL_BG: Record<string, string> = {
  green: 'bg-green-500/10',
  yellow: 'bg-yellow-500/10',
  orange: 'bg-orange-500/10',
  red: 'bg-red-500/10',
}

const SEVERITY_BADGE: Record<string, string> = {
  Extreme: 'bg-red-500/20 text-red-400 border-red-500/50',
  Severe: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  Moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  Minor: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
}

function timeLeft(expires: string): string {
  const now = Date.now()
  const exp = new Date(expires).getTime()
  const diff = exp - now
  if (diff <= 0) return 'EXPIRED'
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

type CommunityReport = {
  id: string
  latitude: number
  longitude: number
  report_type: string
  description: string
}

export default function WarningsClient() {
  const searchParams = useSearchParams()
  const alertFromUrl = searchParams.get('alert')
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [userPoint, setUserPoint] = useState<{ lat: number; lon: number } | null>(null)
  const [geoBusy, setGeoBusy] = useState(false)

  const load = useCallback(
    async (point: { lat: number; lon: number } | null, signal?: AbortSignal) => {
      setLoading(true)
      setError(null)
      const qp = point ? `&point=${point.lat},${point.lon}` : ''
      try {
        const [dRes, gRes, sRes, cRes] = await Promise.all([
          fetch(`/api/weather/alerts?detail=1${qp}`, { signal }),
          fetch(`/api/weather/alerts?geojson=1${qp}`, { signal }),
          fetch('/api/weather/storm-reports?days=2', { signal }),
          fetch('/api/storm-reports', { signal }),
        ])
        if (!dRes.ok) throw new Error('alerts detail failed')
        const dJson = (await dRes.json()) as { alerts: NWSAlertDetail[]; wis: WISScore }
        if (signal?.aborted) return
        setAlerts(dJson.alerts ?? [])
        setWis(dJson.wis ?? null)

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
        setError('Could not load warnings data. Try again shortly.')
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    const ctrl = new AbortController()
    load(userPoint, ctrl.signal)
    return () => ctrl.abort()
  }, [load, userPoint])

  useEffect(() => {
    const ctrl = new AbortController()
    const t = setInterval(() => load(userPoint, ctrl.signal), 90_000)
    return () => {
      clearInterval(t)
      ctrl.abort()
    }
  }, [load, userPoint])

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = [...alerts]
    if (q) {
      list = list.filter(
        (a) =>
          a.event.toLowerCase().includes(q) ||
          a.areaDesc.toLowerCase().includes(q) ||
          a.headline.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      const su =
        (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
      if (su !== 0) return su
      const uu =
        (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9)
      if (uu !== 0) return uu
      return new Date(a.expires).getTime() - new Date(b.expires).getTime()
    })
    return list
  }, [alerts, search])

  const tickerAlerts = useMemo(() => {
    return [...alerts]
      .sort(
        (a, b) =>
          (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
      )
      .slice(0, 12)
  }, [alerts])

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
    () => alerts.find((a) => a.id === selectedId) ?? null,
    [alerts, selectedId]
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
    if (!selected || !initialAlertAppliedRef.current || initialScrollAppliedRef.current) return
    initialScrollAppliedRef.current = true
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selected])

  function requestBrowserLocation() {
    if (!navigator.geolocation) return
    setGeoBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPoint({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setGeoBusy(false)
      },
      () => setGeoBusy(false),
      { enableHighAccuracy: true, maximumAge: 120_000, timeout: 15_000 }
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-mono uppercase">
          Warnings command center
        </h1>
        <p className="text-sm font-mono text-muted-foreground tracking-wider">
          // NWS ACTIVE ALERTS · SPC OUTLOOK · STORM REPORTS //
        </p>
        <ShareButtons
          config={{
            title: 'Warnings command center',
            text: 'Live NWS warnings, outlook context, and storm reports at 16bitweather.co',
            url: 'https://www.16bitweather.co/warnings',
          }}
          className="mt-3 justify-center"
        />
      </div>

      {wis && (
        <div
          className={cn(
            'border rounded-lg p-6 md:p-8',
            LEVEL_BG[wis.level],
            LEVEL_COLORS[wis.level]
          )}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left space-y-1">
              <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
                Weather Intensity Score
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-6xl md:text-7xl font-extrabold font-mono">{wis.score}</span>
                <span className="text-lg font-mono text-muted-foreground">/ 100</span>
              </div>
              <p className={cn('text-lg font-bold font-mono tracking-wider', LEVEL_COLORS[wis.level])}>
                {wis.label}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold font-mono">{wis.nwsWarnings ?? wis.activeWarnings}</p>
                <p className="text-xs font-mono text-muted-foreground uppercase">NWS warnings</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold font-mono">{wis.nwsWatches ?? wis.activeWatches}</p>
                <p className="text-xs font-mono text-muted-foreground uppercase">NWS watches</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold font-mono">{wis.nwsAdvisories ?? wis.activeAdvisories}</p>
                <p className="text-xs font-mono text-muted-foreground uppercase">Other products</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {Object.keys(severityCounts).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {(['Extreme', 'Severe', 'Moderate', 'Minor'] as const).map((sev) => {
            const count = severityCounts[sev]
            if (!count) return null
            return (
              <span
                key={sev}
                className={cn(
                  'px-3 py-1.5 rounded-full border text-sm font-mono font-bold',
                  SEVERITY_BADGE[sev]
                )}
              >
                {count} {sev.toUpperCase()}
              </span>
            )
          })}
          <span className="px-3 py-1.5 rounded-full border border-border text-sm font-mono text-muted-foreground">
            {alerts.length} TOTAL ALERTS
          </span>
        </div>
      )}

      <SPCDay1RiskStrip />

      {tickerAlerts.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1 border-b border-amber-500/30 bg-amber-500/10">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-200">
              Live wire
            </span>
          </div>
          <div className="overflow-x-auto whitespace-nowrap py-2 px-2 font-mono text-xs">
            {tickerAlerts.map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className="inline-block mr-3 px-2 py-1 rounded border border-border bg-background/80 hover:bg-muted text-left max-w-[280px] truncate"
              >
                <span className="font-bold text-orange-300">{a.event}</span>
                <span className="text-muted-foreground"> — {a.areaDesc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="font-mono"
            disabled={geoBusy}
            onClick={requestBrowserLocation}
          >
            {userPoint ? 'Refresh my area' : 'Use my location'}
          </Button>
          {userPoint && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-mono"
              onClick={() => setUserPoint(null)}
            >
              National view
            </Button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Filter by event, area, headline…"
            className="font-mono w-64 max-w-[70vw]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="button" size="sm" variant="outline" className="font-mono" onClick={() => load(userPoint)}>
            Refresh now
          </Button>
        </div>
      </div>

      {userPoint && (
        <p className="text-xs font-mono text-muted-foreground">
          Showing alerts for point {userPoint.lat.toFixed(3)}, {userPoint.lon.toFixed(3)} (NWS point query).
        </p>
      )}

      {error && (
        <p className="text-center text-red-400 font-mono text-sm border border-red-500/40 rounded-lg p-4">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 min-h-[320px]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-mono uppercase">Alert list</h2>
            <span className="text-xs text-muted-foreground font-mono">{sorted.length} shown</span>
          </div>
          {loading && (
            <p className="text-muted-foreground font-mono animate-pulse py-8 text-center">Loading…</p>
          )}
          {!loading && sorted.length === 0 && (
            <div className="border border-border rounded-lg p-6 text-center font-mono text-muted-foreground">
              No alerts match this view.
            </div>
          )}
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {!loading &&
              sorted.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => setSelectedId(a.id === selectedId ? null : a.id)}
                  className={cn(
                    'w-full text-left rounded-lg border p-3 font-mono text-xs transition-colors',
                    a.id === selectedId
                      ? 'border-amber-500/60 bg-amber-500/10'
                      : 'border-border bg-card/40 hover:bg-card/70'
                  )}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-bold text-sm">{a.event}</span>
                    <span className="text-muted-foreground shrink-0">{timeLeft(a.expires)}</span>
                  </div>
                  <p className="text-muted-foreground truncate mt-1">{a.areaDesc}</p>
                  {a.headline && <p className="text-muted-foreground mt-1 line-clamp-2">{a.headline}</p>}
                </button>
              ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold font-mono uppercase">Map</h2>
          <p className="text-xs text-muted-foreground font-mono">
            Polygons: NWS warnings/watches. Blue: SPC storm reports (recent days). Purple: community (approved
            only).
          </p>
          <WarningsAlertMap
            geoJson={geoJson}
            extraPoints={mapPoints}
            onSelectFeature={(p) => {
              const id = String(p.id ?? '')
              if (id) setSelectedId(id)
            }}
          />
          <div className="flex flex-wrap gap-3 text-xs font-mono">
            <Link href="/radar" className="underline text-primary">
              Open radar
            </Link>
            <Link href="/severe" className="underline text-primary">
              SPC outlooks
            </Link>
            <a href="https://www.weather.gov" className="underline text-primary" rel="noreferrer" target="_blank">
              weather.gov
            </a>
          </div>
        </div>
      </div>

      {selected && (
        <div
          ref={detailRef}
          id="warnings-alert-detail"
          className="rounded-lg border border-border bg-card/60 p-4 space-y-3 font-mono text-sm scroll-mt-24"
        >
          <div className="flex flex-wrap justify-between gap-2">
            <h3 className="font-bold text-lg">{selected.event}</h3>
            <span className="text-xs text-muted-foreground">{selected.severity} · {selected.urgency}</span>
          </div>
          <p className="text-xs text-muted-foreground">{selected.areaDesc}</p>
          {selected.instruction ? (
            <div>
              <p className="text-xs uppercase text-amber-200 font-bold mb-1">What to do</p>
              <p className="whitespace-pre-wrap leading-relaxed">{selected.instruction}</p>
            </div>
          ) : null}
          {selected.description ? (
            <div>
              <p className="text-xs uppercase text-muted-foreground font-bold mb-1">Description</p>
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed text-xs">{selected.description}</p>
            </div>
          ) : null}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <StormReportForm />
        <div className="rounded-lg border border-border bg-card/40 p-4 font-mono text-xs text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">SPC reports</strong> are official climatological CSVs (recent days).
            <strong className="text-foreground"> Community dots</strong> require sign-in, moderation, and approval.
          </p>
          <p>
            Map popups show NWS text when you click a polygon. For the full product, follow links on{' '}
            <a className="underline text-primary" href="https://alerts.weather.gov" target="_blank" rel="noreferrer">
              alerts.weather.gov
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

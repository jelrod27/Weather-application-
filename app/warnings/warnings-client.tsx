'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
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
import type { AlertsFeatureCollection, MapPoint } from '@/components/warnings/warnings-alert-map'
import StormReportForm from '@/components/warnings/storm-report-form'
import { WarningDetailBody } from '@/components/warnings/warning-detail-body'
import { GuestAlertSignup } from '@/components/alerts/guest-alert-signup'
import { PushOptIn } from '@/components/alerts/push-opt-in'
import WarningPinSearch from '@/components/warnings/warning-pin-search'
import { useActivePinState } from '@/hooks/use-active-pin'
import { filterDeskAlerts, splitLocalWarnings, uniqueAlertStates, type DeskEventFilter } from '@/lib/warnings/local-ranking'
import { warningDeskScore } from '@/lib/bitwatch/priority'
import { formatWarningTimeLeft } from '@/lib/warnings/nws-parameters'
import { getWarningDetailHref } from '@/lib/warnings/alert-links'

const WarningsAlertMap = dynamic(
  () => import('@/components/warnings/warnings-alert-map'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center rounded-lg border border-[var(--border,currentColor)] text-sm opacity-70">
        Loading map…
      </div>
    ),
  },
)

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

type CommunityReport = {
  id: string
  latitude: number
  longitude: number
  report_type: string
  description: string
}

function AlertLane({
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

export default function WarningsClient() {
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
    const ctrl = new AbortController()
    const run = async () => {
      try {
        const res = await fetch(
          `/api/weather/alerts?harm=1&detail=1&point=${encodeURIComponent(`${pin.lat},${pin.lon}`)}`,
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
  }, [pin])

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-mono uppercase">
          Warning center
        </h1>
        <p className="text-sm font-mono text-muted-foreground tracking-wider">
          // YOUR PIN FIRST · NATIONAL BROWSE · NWS POLYGONS //
        </p>
        {freshness ? (
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Feed {freshness === 'fresh' ? 'canonical store' : freshness}
          </p>
        ) : null}
        {pin ? (
          <p data-testid="warning-pin-status" className="text-xs font-mono text-muted-foreground">
            Pin: {pin.label} ({pin.lat.toFixed(3)}, {pin.lon.toFixed(3)})
          </p>
        ) : pinResolving && pinLabel ? (
          <p data-testid="warning-pin-status" className="text-xs font-mono text-muted-foreground">
            Resolving pin: {pinLabel}
          </p>
        ) : (
          <p data-testid="warning-pin-status" className="text-xs font-mono text-muted-foreground">
            Set a pin to rank warnings on you. Unknown geometry is never local.
          </p>
        )}
        <WarningPinSearch label={pinLabel} />
        <ShareButtons
          config={{
            title: 'Warning center',
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
            LEVEL_COLORS[wis.level],
          )}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left space-y-1">
              <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
                Happening now · Weather Intensity Score
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
                  SEVERITY_BADGE[sev],
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

      <div className="flex flex-wrap gap-2 items-center justify-end">
        <select
          aria-label="Filter by warning type"
          data-testid="warning-event-filter"
          className="font-mono text-xs border border-border bg-background rounded-md px-2 py-2"
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value as DeskEventFilter)}
        >
          <option value="all">All types</option>
          <option value="Tornado Warning">Tornado Warning</option>
          <option value="Severe Thunderstorm Warning">Severe Thunderstorm Warning</option>
          <option value="Flash Flood Warning">Flash Flood Warning</option>
          <option value="other">Other NWS products</option>
        </select>
        <select
          aria-label="Filter by state"
          data-testid="warning-state-filter"
          className="font-mono text-xs border border-border bg-background rounded-md px-2 py-2"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
        >
          <option value="">All states</option>
          {stateOptions.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <Input
          placeholder="Filter by event, area, headline…"
          className="font-mono w-64 max-w-[70vw]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="button" size="sm" variant="outline" className="font-mono" onClick={() => void load()}>
          Refresh now
        </Button>
      </div>

      {error && (
        <p className="text-center text-red-400 font-mono text-sm border border-red-500/40 rounded-lg p-4">
          {error}
        </p>
      )}

      {selected && (
        <div
          ref={detailRef}
          id="warnings-alert-detail"
          className="rounded-lg border border-amber-500/50 bg-card/80 p-4 md:p-6 scroll-mt-24"
        >
          <WarningDetailBody alert={selected} showDetailLink />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6 min-h-[320px]">
          {loading && (
            <p className="text-muted-foreground font-mono animate-pulse py-8 text-center">Loading…</p>
          )}
          {!loading && (
            <>
              <AlertLane
                title="On you"
                alerts={onYou}
                selectedId={selected?.id ?? null}
                onSelect={setSelectedId}
                empty={
                  pin
                    ? 'No polygons cover this pin. Nearby storm cells are listed below.'
                    : 'Set a pin to see warnings covering your location.'
                }
              />
              <AlertLane
                title="Nearby"
                alerts={nearby}
                selectedId={selected?.id ?? null}
                onSelect={setSelectedId}
                empty={
                  pin
                    ? 'No other warnings within about 50 miles of this pin.'
                    : 'Set a pin to see nearby warnings.'
                }
              />
              <AlertLane
                title="Elsewhere"
                alerts={elsewhere}
                selectedId={selected?.id ?? null}
                onSelect={setSelectedId}
                empty="No other national alerts match this filter."
              />
            </>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold font-mono uppercase">Map</h2>
          <p className="text-xs text-muted-foreground font-mono">
            Polygons: NWS warnings/watches. Blue: SPC storm reports (recent days). Purple: community
            (approved only).
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
            <Link
              href={selected ? getWarningDetailHref(selected.id) : '/radar'}
              className="underline text-primary"
            >
              {selected ? 'Warning detail' : 'Open radar'}
            </Link>
            <Link href="/radar" className="underline text-primary">
              Radar
            </Link>
            <Link href="/news" className="underline text-primary">
              News
            </Link>
            <Link href="/severe" className="underline text-primary">
              SPC outlooks
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-mono text-muted-foreground">
            Prefer the dedicated landing?{' '}
            <Link href="/alerts" className="underline text-primary">
              Open Bitwatch
            </Link>
            .
          </p>
          <GuestAlertSignup pin={pin} />
        </div>
        <PushOptIn />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StormReportForm initialLat={pin?.lat} initialLon={pin?.lon} />
        <div className="rounded-lg border border-border bg-card/40 p-4 font-mono text-xs text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">SPC reports</strong> are official climatological CSVs
            (recent days).
            <strong className="text-foreground"> Community photos</strong> require sign-in, moderation,
            and approval. This is the 16-bit media layer — not a shop, stream, or phone-call product.
          </p>
          <p>
            Map popups show NWS text when you click a polygon. Full products live on{' '}
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

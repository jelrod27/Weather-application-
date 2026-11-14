'use client'

import { useEffect, useState } from 'react'
import { useWinterPlace } from '@/hooks/use-winter-place'
import { useWinterResource } from '@/hooks/use-winter-resource'
import WinterAlerts from './winter-alerts'
import WinterLocalForecast from './winter-local-forecast'
import WinterNationalOutlook from './winter-national-outlook'
import WinterPlaceSearch from './winter-place-search'
import type { LocalWinterForecast } from '@/lib/winter/local-types'
import type { NWSAlert } from '@/lib/services/nws-alerts-service'
import type { WinterMapSelection, WinterMapSnapshot } from '@/lib/winter/types'
import type { ReactElement } from 'react'

interface WinterAlertResponse {
  alerts: NWSAlert[]
  coverage?: 'outside-nws'
}

export default function WinterWorkspace(): ReactElement {
  const [selection, setSelection] = useState<WinterMapSelection>({ product: 'snow', day: 1, threshold: 4 })
  const [now, setNow] = useState(0)
  const [shareStatus, setShareStatus] = useState('')
  const { place, selectPlace, invalidLink, ready } = useWinterPlace()
  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])
  const national = useWinterResource<WinterMapSnapshot>(`/api/winter/outlook?${new URLSearchParams({ product: selection.product, day: String(selection.day), threshold: String(selection.threshold) })}`)
  const local = useWinterResource<LocalWinterForecast>(place ? `/api/winter/forecast?${new URLSearchParams({ lat: String(place.lat), lon: String(place.lon) })}` : null)
  const alerts = useWinterResource<WinterAlertResponse>(ready ? `/api/weather/alerts${place ? `?${new URLSearchParams({ point: `${place.lat},${place.lon}` })}` : ''}` : null)
  const alertError = alerts.error || (alerts.data?.coverage === 'outside-nws' ? 'This location is outside NWS alert coverage.' : alerts.data && !Array.isArray(alerts.data.alerts) ? 'Alert response unavailable.' : null)
  const localStale = !!local.error || local.data?.status === 'stale' || (!!local.data?.gridUpdatedAt && now - Date.parse(local.data.gridUpdatedAt) > 18 * 3600000)

  async function share(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareStatus('Forecast link copied.')
    } catch {
      setShareStatus('Copy the address in your browser to share this forecast.')
    }
  }

  return <div className="space-y-6" data-testid="winter-workspace">
    <WinterNationalOutlook selection={selection} onSelect={setSelection} snapshot={national.data} loading={national.loading} error={national.error} place={place} now={now} />
    <section className="rounded-xl border border-border bg-card/50 p-4 sm:p-6 space-y-5" aria-labelledby="winter-local-heading">
      <div className="flex flex-wrap justify-between items-center gap-3"><h2 id="winter-local-heading" className="text-xl font-mono font-bold uppercase">Local winter forecast</h2><span className="text-xs text-muted-foreground font-mono">NWS POINT FORECAST · NEXT 72 HOURS</span></div>
      <WinterPlaceSearch onSelect={next => { selectPlace(next); setShareStatus('') }} />
      {invalidLink && <p role="status">The shared location has invalid coordinates. Search for a US city or ZIP code.</p>}
      {place ? <>
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4"><h3 className="text-lg font-bold">{place.name}</h3><button type="button" onClick={() => void share()} className="min-h-11 rounded border border-border px-3 py-2 text-sm hover:bg-primary/10">Copy forecast link</button><button type="button" onClick={() => { selectPlace(null); setShareStatus('') }} className="min-h-11 rounded border border-border px-3 py-2 text-sm hover:bg-primary/10">Clear location</button></div>
        {shareStatus && <p role="status" className="text-sm">{shareStatus}</p>}
        <div aria-busy={local.loading} className={local.loading && !local.data ? 'min-h-[260px]' : ''}>
          {local.loading && <p role="status" className="text-sm mb-4">{local.data ? 'Refreshing local forecast…' : 'Loading official local forecast…'}</p>}
          {local.error && !local.data && <div role="status" className="space-y-3"><p>Local forecast unavailable. Snow and ice amounts are unknown; try again or check the NWS forecast.</p><a href={`https://forecast.weather.gov/MapClick.php?lat=${place.lat}&lon=${place.lon}`} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">Open official NWS local forecast ↗</a></div>}
          {local.data && <WinterLocalForecast forecast={local.data} stale={localStale} />}
          {(local.error || local.data?.status === 'unavailable' || local.data?.status === 'stale') && <button type="button" onClick={local.refresh} className="mt-3 min-h-11 rounded border border-border px-4 py-2 text-sm">Retry local forecast</button>}
        </div>
      </> : <div className="min-h-24 border border-dashed border-border rounded p-4 text-sm text-muted-foreground leading-relaxed">Find your location for separate snow and ice amounts, published accumulation intervals, hourly conditions, and the NWS forecaster narrative. National map colors are regional guidance, not local snowfall totals.</div>}
    </section>
    <WinterAlerts alerts={alertError && !alerts.error ? null : alerts.data?.alerts ?? null} loading={!ready || alerts.loading} error={alertError} stale={!!alerts.error && !!alerts.data} place={place} />
    {(national.error || national.data?.status === 'unavailable' || national.data?.status === 'stale' || alertError) && <button type="button" onClick={() => { national.refresh(); alerts.refresh() }} className="min-h-11 rounded border border-border px-4 py-2 text-sm">Retry outlook and alerts</button>}
  </div>
}

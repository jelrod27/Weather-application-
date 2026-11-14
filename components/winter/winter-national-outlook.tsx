'use client'

import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { winterInterval, winterTime } from './winter-time'
import { getWinterMapState } from './winter-map-data'
import type { WinterMapSelection, WinterMapSnapshot, WinterPlace } from '@/lib/winter/types'
import type { ReactElement } from 'react'

const WinterMap = dynamic(() => import('./winter-map'), {
  ssr: false,
  loading: () => <div className="h-[560px] md:h-[660px] bg-background/50 grid place-items-center font-mono text-sm" role="status">Loading winter map…</div>,
})

interface WinterNationalOutlookProps {
  selection: WinterMapSelection
  onSelect: (selection: WinterMapSelection) => void
  snapshot: WinterMapSnapshot | null
  loading: boolean
  error: string | null
  place: WinterPlace | null
  now: number
}

const CONTROL = 'min-h-11 rounded border px-3 py-2 text-sm font-mono focus-visible:outline-2 focus-visible:outline-primary'

export default function WinterNationalOutlook({ selection, onSelect, snapshot, loading, error, place, now }: WinterNationalOutlookProps): ReactElement {
  const state = getWinterMapState(snapshot, now)
  const expired = state.status === 'expired'
  const shown = snapshot
  const title = selection.product === 'snow' ? `Chance of exceeding ${selection.threshold} inches of snow` : selection.product === 'ice' ? 'Chance of exceeding 0.25 inches of ice' : 'Winter Storm Severity Index · overall impacts'
  const usable = shown && (state.status === 'available' || state.status === 'empty')
  return <section aria-labelledby="winter-national-heading" className="rounded-xl border border-border bg-card/50 overflow-hidden" data-testid="winter-national-outlook">
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-2"><h2 id="winter-national-heading" className="text-xl font-mono font-bold uppercase">National winter outlook</h2><span className="text-xs text-muted-foreground self-center font-mono">CONUS · NWS / WPC</span></div>
      <fieldset><legend className="text-xs uppercase font-mono text-muted-foreground mb-2">Forecast layer</legend><div className="flex flex-wrap gap-2">{(['snow', 'ice', 'impacts'] as const).map(product => <button key={product} type="button" aria-pressed={selection.product === product} onClick={() => onSelect({ ...selection, product })} className={cn(CONTROL, selection.product === product ? 'border-primary bg-primary/15 text-foreground font-semibold' : 'border-border hover:bg-primary/5')}>{product === 'snow' ? 'Snow probability' : product === 'ice' ? 'Ice probability' : 'Winter impacts'}</button>)}</div></fieldset>
      <div className="flex flex-wrap gap-5">
        <fieldset><legend className="text-xs uppercase font-mono text-muted-foreground mb-2">Forecast period</legend><div className="flex gap-2">{([1, 2, 3] as const).map(day => <button key={day} type="button" aria-pressed={selection.day === day} onClick={() => onSelect({ ...selection, day })} className={cn(CONTROL, selection.day === day ? 'border-primary bg-primary/15 text-foreground font-semibold' : 'border-border')}>Day {day}</button>)}</div></fieldset>
        {selection.product === 'snow' && <fieldset><legend className="text-xs uppercase font-mono text-muted-foreground mb-2">Snow threshold (24 hours)</legend><div className="flex gap-2">{([4, 8, 12] as const).map(threshold => <button key={threshold} type="button" aria-pressed={selection.threshold === threshold} onClick={() => onSelect({ ...selection, threshold })} className={cn(CONTROL, selection.threshold === threshold ? 'border-primary bg-primary/15 text-foreground font-semibold' : 'border-border')}>{threshold} inches</button>)}</div></fieldset>}
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <div role="status" aria-live="polite" className="text-sm space-y-1 min-h-[84px]">
        {usable && <p>Forecast valid: {winterInterval(shown.validFrom, shown.validTo)}</p>}
        {loading && <p>{snapshot ? 'Refreshing official outlook…' : 'Loading official outlook…'}</p>}
        {(!loading && (error || expired || state.status === 'unavailable' || state.status === 'invalid')) && <p>{usable ? 'Stale outlook — refresh failed; showing the previous valid source cycle.' : expired ? 'Outlook expired. Old overlays are hidden while a current source cycle is unavailable.' : 'Outlook unavailable. This does not mean there is no winter weather risk.'}</p>}
        {state.status === 'stale' && !error && <p>Stale source cycle — use the official source for the latest outlook.</p>}
        {shown?.message && <p>{shown.message}</p>}
        {usable && <p>{shown.status === 'empty' ? 'No mapped contours meet this threshold for this source period. Lower amounts and local hazards remain possible.' : `${shown.contours.features.length} regional forecast contours. Categories shown: ${[...new Set(shown.contours.features.map(feature => feature.properties.label))].join(', ')}.`}</p>}
      </div>
    </div>
    <div className="min-h-[560px] md:min-h-[660px] border-y border-border"><WinterMap snapshot={usable ? shown : null} place={place} /></div>
    <div className="p-4 sm:px-6 space-y-3 min-h-[160px]">
      {usable && <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs" aria-label="Map legend">{shown.legend.map(item => <li key={item.label} className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-5 rounded-sm border border-foreground/30" style={{ backgroundColor: item.color }} />{item.label}</li>)}</ul>}
      <p className="text-xs text-muted-foreground">Regional guidance; contour boundaries are not street-level forecasts. Probabilities, accumulation amounts, and impact categories describe different things.</p>
      {shown && <div className="text-xs text-muted-foreground space-y-1"><p>Issued: {winterTime(shown.issuedAt, 'UTC', true)} · Valid: {winterInterval(shown.validFrom, shown.validTo)}</p><p>Retrieved: {winterTime(shown.fetchedAt, 'UTC', true)}</p><a href={shown.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block py-2 text-primary underline underline-offset-4">{shown.source} ↗</a></div>}
    </div>
  </section>
}

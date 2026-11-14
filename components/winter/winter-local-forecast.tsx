import { winterInterval, winterTime } from './winter-time'
import type { LocalWinterForecast, WinterAccumulation } from '@/lib/winter/local-types'
import type { ReactElement } from 'react'

interface WinterLocalForecastProps {
  forecast: LocalWinterForecast
  stale: boolean
}

function accumulationAmount(inches: number | null): string {
  if (inches === null) return 'Unknown'
  return inches > 0 && inches < 0.01 ? '<0.01 in' : `${inches.toFixed(2)} in`
}

function AccumulationCard({ title, value, timeZone }: { title: string; value: WinterAccumulation; timeZone: string }): ReactElement {
  const blocks = value.blocks.filter(block => Date.parse(block.endTime) > Date.now())
  return (
    <section className="border border-border rounded-lg bg-background/50 p-4 space-y-3" aria-label={`${title} accumulation`}>
      <h3 className="font-mono font-bold uppercase tracking-wider">{title} accumulation</h3>
      <p className="text-3xl font-mono font-bold text-primary">{accumulationAmount(value.total.inches)}</p>
      <p className="text-sm font-semibold">{value.total.inches === null ? 'Accumulation unavailable' : value.total.complete ? 'Known-period total — complete coverage' : 'Known-period total — partial coverage'}</p>
      <p className="text-xs text-muted-foreground">{winterInterval(value.total.startTime, value.total.endTime, timeZone)}</p>
      <p className="text-xs text-muted-foreground">{value.total.includedPeriods} published intervals included. Ongoing and boundary-crossing blocks below are excluded from this total; their displayed amounts cover the full interval, not the amount remaining.</p>
      {value.issues.length > 0 && <p className="text-sm text-muted-foreground">{value.issues.join(' ')}</p>}
      {blocks.length > 0 ? <details className="border-t border-border pt-2"><summary className="cursor-pointer py-2 text-sm font-semibold">Show {title.toLowerCase()} forecast periods</summary><div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="text-left py-2 font-semibold">Published accumulation blocks (usually six hours)</caption>
        <thead><tr className="border-b border-border"><th scope="col" className="py-2 pr-3">Source interval</th><th scope="col" className="py-2">Amount</th></tr></thead>
        <tbody>{blocks.map(block => <tr key={`${block.startTime}/${block.endTime}`} className="border-b border-border/50">
          <th scope="row" className="py-3 pr-3 font-normal">{winterInterval(block.startTime, block.endTime, timeZone)}{block.ongoing && <span className="block text-xs text-primary">Ongoing: full interval amount</span>}</th>
          <td className="py-3 whitespace-nowrap">{accumulationAmount(block.inches)}</td>
        </tr>)}</tbody>
      </table></div></details> : <p className="text-sm text-muted-foreground">No future accumulation blocks available.</p>}
    </section>
  )
}

export default function WinterLocalForecast({ forecast, stale }: WinterLocalForecastProps): ReactElement {
  const timeZone = forecast.place.timeZone || 'UTC'
  const hourly = forecast.hourly.filter(period => Date.parse(period.endTime) > Date.now())
  const narrative = forecast.narrative.filter(period => Date.parse(period.endTime) > Date.now())
  return <div className="space-y-5" data-testid="winter-local-forecast">
    {stale && <p role="status" className="border-l-4 border-primary pl-3 text-sm">Stale forecast — the latest refresh or source update is unavailable. Check the source before making plans.</p>}
    {forecast.message && <p className="text-sm text-muted-foreground">{forecast.message}</p>}
    {forecast.coverage === 'unsupported' ? <p role="status">Local winter forecasting currently supports the contiguous United States. Select a supported US city or ZIP code.</p> : <>
      <p className="text-sm font-semibold">Official NWS forecast point near {forecast.place.name} ({forecast.place.lat.toFixed(3)}, {forecast.place.lon.toFixed(3)})</p>
      <p className="text-sm text-muted-foreground">72-hour request window: {winterInterval(forecast.windowStart, forecast.windowEnd, timeZone)}. Totals include only known, non-overlapping published blocks wholly inside this window. Displayed blocks can extend outside it.</p>
      <div className="grid gap-4 md:grid-cols-2"><AccumulationCard title="Snow" value={forecast.snow} timeZone={timeZone} /><AccumulationCard title="Ice" value={forecast.ice} timeZone={timeZone} /></div>
      <details className="rounded-lg border border-border p-4" open>
        <summary className="cursor-pointer font-mono font-bold">NWS forecaster narrative</summary>
        {narrative.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{narrative.map(period => <article key={period.startTime} className="p-3 bg-background/50 rounded border border-border/50">
          <h3 className="font-semibold">{period.name}</h3><p className="text-xs text-muted-foreground mt-1">{winterInterval(period.startTime, period.endTime, timeZone)}</p><p className="text-sm leading-relaxed mt-2">{period.detailedForecast}</p>
        </article>)}</div> : <p className="mt-3 text-sm text-muted-foreground">Forecaster narrative unavailable.</p>}
      </details>
      <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer font-mono font-bold">Hourly conditions · {hourly.length} periods</summary>
        {hourly.length ? <div className="overflow-x-auto mt-3"><table className="w-full text-sm text-left min-w-[570px]">
          <caption className="text-left pb-3 text-muted-foreground">NWS hourly forecast. Precipitation chance includes all precipitation types; it is not a snowfall probability.</caption>
          <thead><tr className="border-b border-border">{['Hour', 'Temperature', 'Wind', 'Precip. chance', 'Conditions'].map(name => <th key={name} scope="col" className="py-2 pr-4">{name}</th>)}</tr></thead>
          <tbody>{hourly.map(period => <tr key={period.startTime} className="border-b border-border/50">
            <th scope="row" className="py-3 pr-4 font-normal">{winterTime(period.startTime, timeZone)}{period.ongoing ? ' (ongoing)' : ''}</th>
            <td className="pr-4">{period.temperatureF === null ? 'Unknown' : `${period.temperatureF}°F`}</td>
            <td className="pr-4">{period.windSpeed ? `${period.windDirection || ''} ${period.windSpeed}`.trim() : 'Unknown'}</td>
            <td className="pr-4">{period.precipitationProbability === null ? 'Unknown' : `${period.precipitationProbability}%`}</td><td>{period.shortForecast || 'Unknown'}</td>
          </tr>)}</tbody>
        </table></div> : <p className="mt-3 text-sm text-muted-foreground">Hourly conditions unavailable.</p>}
      </details>
    </>}
    <div className="text-xs text-muted-foreground space-y-1">
      <p>Grid updated: {winterTime(forecast.gridUpdatedAt, timeZone, true)} · Hourly updated: {winterTime(forecast.hourlyUpdatedAt, timeZone, true)}</p>
      <p>Narrative updated: {winterTime(forecast.narrativeUpdatedAt, timeZone, true)} · Retrieved: {winterTime(forecast.fetchedAt, timeZone, true)}</p>
      <a href={forecast.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block py-2 text-primary underline underline-offset-4">Open official NWS local forecast ↗</a>
    </div>
  </div>
}

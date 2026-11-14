import Link from 'next/link'
import { winterTime } from './winter-time'
import type { NWSAlert } from '@/lib/services/nws-alerts-service'
import type { WinterPlace } from '@/lib/winter/types'
import type { ReactElement } from 'react'

const WINTER_KEYWORDS = ['winter', 'snow', 'ice', 'blizzard', 'freeze', 'cold', 'wind chill', 'frost']
const SEVERITY_ORDER: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3 }

interface WinterAlertsProps {
  alerts: NWSAlert[] | null
  loading: boolean
  error: string | null
  stale: boolean
  place: WinterPlace | null
}

export default function WinterAlerts({ alerts, loading, error, stale, place }: WinterAlertsProps): ReactElement {
  const filtered = (alerts || []).filter(alert => WINTER_KEYWORDS.some(word => alert.event.toLowerCase().includes(word)) && Date.parse(alert.expires) > Date.now()).sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4))
  return <section className="rounded-xl border border-border bg-card/50 p-4 sm:p-6 space-y-4 min-h-[230px]" aria-labelledby="winter-alerts-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="winter-alerts-heading" className="font-mono text-lg font-bold uppercase">Winter alerts</h2><Link href="/warnings" className="text-sm text-primary underline underline-offset-4 py-2">Open warning desk →</Link></div>
    <p className="text-sm text-muted-foreground">{place ? `NWS alerts at ${place.name}` : 'National NWS alert feed'} · Watches, warnings and advisories</p>
    {loading && !alerts && <p role="status">Loading official winter alerts…</p>}
    {error && <p role="status">{stale ? 'Stale alerts — refresh failed. Retained alerts may have changed.' : 'Winter alerts unavailable. Check the official warning desk; this is not an all-clear.'}</p>}
    {!loading && !error && alerts !== null && filtered.length === 0 && <p>No active winter alerts {place ? 'at this location' : 'in the national feed'} at the last successful check.</p>}
    {filtered.length > 0 && <details open={!!place} className="rounded border border-border p-3">
      <summary className="cursor-pointer py-2 font-semibold">View {filtered.length} active winter {filtered.length === 1 ? 'alert' : 'alerts'}</summary>
      <ul className="mt-3 space-y-3">{filtered.map(alert => <li key={alert.id} className="rounded border border-border p-3">
      <div className="flex flex-wrap gap-2 items-center"><span className="text-xs border border-primary/50 text-primary rounded px-2 py-1 font-mono">{alert.severity}</span><h3 className="font-semibold">{alert.event}</h3></div>
      <p className="text-sm text-muted-foreground mt-2">{alert.areaDesc}</p>{alert.headline && <p className="text-sm mt-2">{alert.headline}</p>}
      <p className="text-xs text-muted-foreground mt-2">Expires {winterTime(alert.expires)}</p>
    </li>)}</ul></details>}
    <p className="text-xs text-muted-foreground">Alert severity does not predict road passability or school closures. Follow local NWS and emergency instructions.</p>
  </section>
}

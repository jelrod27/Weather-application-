import Link from 'next/link'
import { formatCoverageLabel } from '@/lib/bitwatch/coverage'
import { warningDeskScore } from '@/lib/bitwatch/priority'
import { warningRadarCropSrc } from '@/lib/bitwatch/radar-crop'
import { getRadarHrefForGeometry, getWarningDetailHref } from '@/lib/warnings/alert-links'
import { formatWarningTimeLeft } from '@/lib/warnings/nws-parameters'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import { cn } from '@/lib/utils'

const SEVERITY_BADGE: Record<string, string> = {
  Extreme: 'bg-red-500/20 text-red-400 border-red-500/50',
  Severe: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  Moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  Minor: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
}

export type WarningDetailBodyProps = {
  alert: NWSAlertDetail
  compact?: boolean
  showDetailLink?: boolean
}

export function WarningDetailBody({
  alert,
  compact = false,
  showDetailLink = false,
}: WarningDetailBodyProps) {
  const radarHref = getRadarHrefForGeometry(alert.geometry)
  const { maxHail, maxWind, source, damageThreat } = alert.hazard ?? {
    maxHail: null,
    maxWind: null,
    source: null,
    damageThreat: null,
  }
  const hasHazards = Boolean(maxHail || maxWind || source || damageThreat)
  const coverage = formatCoverageLabel(alert.geometry)
  const priority = warningDeskScore(alert)
  const cropSrc = warningRadarCropSrc(alert.geometry)
  const zones = alert.ugc?.length ? alert.ugc : alert.affectedZones
  const motion = alert.motion

  return (
    <div className="space-y-3 font-mono text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className={cn('font-bold uppercase tracking-tight', compact ? 'text-lg' : 'text-2xl')}>
            {alert.event}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{alert.areaDesc}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase',
              SEVERITY_BADGE[alert.severity] ?? 'border-border',
            )}
          >
            {alert.severity} · {alert.urgency}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatWarningTimeLeft(alert.expires)} left
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Issued {alert.sent || alert.effective || 'unknown'} · Expires {alert.expires}
        {alert.warningEventId ? ` · VTEC ${alert.warningEventId}` : ''}
        {alert.vtecAction ? ` · ${alert.vtecAction}` : ''}
      </p>

      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="uppercase text-muted-foreground">Priority</dt>
          <dd className="font-bold">{priority.toFixed(1)}</dd>
        </div>
        {coverage ? (
          <>
            <div>
              <dt className="uppercase text-muted-foreground">Coverage</dt>
              <dd className="font-bold">{coverage.km2Label}</dd>
            </div>
            <div>
              <dt className="uppercase text-muted-foreground">Population</dt>
              <dd className="font-bold">{coverage.peopleLabel} approx</dd>
            </div>
          </>
        ) : null}
        {motion ? (
          <div>
            <dt className="uppercase text-muted-foreground">Motion</dt>
            <dd className="font-bold">
              {motion.speedKt} kt / {motion.headingDeg}°
            </dd>
          </div>
        ) : null}
      </dl>
      {coverage ? (
        <p className="text-[10px] text-muted-foreground">
          Population is polygon area × CONUS average density. Not a census count.
        </p>
      ) : null}

      {hasHazards ? (
        <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {maxHail ? (
            <div>
              <dt className="uppercase text-muted-foreground">Hail</dt>
              <dd className="font-bold">{maxHail}</dd>
            </div>
          ) : null}
          {maxWind ? (
            <div>
              <dt className="uppercase text-muted-foreground">Wind</dt>
              <dd className="font-bold">{maxWind}</dd>
            </div>
          ) : null}
          {source ? (
            <div>
              <dt className="uppercase text-muted-foreground">Source</dt>
              <dd className="font-bold">{source}</dd>
            </div>
          ) : null}
          {damageThreat ? (
            <div>
              <dt className="uppercase text-muted-foreground">Threat</dt>
              <dd className="font-bold">{damageThreat}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {zones && zones.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          <span className="uppercase font-bold">Zones</span> {zones.slice(0, 12).join(', ')}
          {zones.length > 12 ? ` +${zones.length - 12}` : ''}
        </p>
      ) : null}

      {cropSrc && !compact ? (
        <div>
          <p className="text-xs uppercase text-muted-foreground font-bold mb-1">Radar crop</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cropSrc}
            alt={`NEXRAD crop for ${alert.event}`}
            data-testid="warning-radar-crop"
            className="w-full max-w-xl rounded-md border border-border bg-black"
            width={640}
            height={480}
          />
        </div>
      ) : null}

      {alert.instruction ? (
        <div>
          <p className="text-xs uppercase text-amber-200 font-bold mb-1">Official instruction</p>
          <p className="whitespace-pre-wrap leading-relaxed">{alert.instruction}</p>
        </div>
      ) : null}

      {alert.description && !compact ? (
        <div>
          <p className="text-xs uppercase text-muted-foreground font-bold mb-1">Statement</p>
          <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed text-xs">
            {alert.description}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 text-xs">
        <Link href={radarHref} className="underline text-primary">
          Open radar for this polygon
        </Link>
        {showDetailLink ? (
          <Link href={getWarningDetailHref(alert.id)} className="underline text-primary">
            Full warning
          </Link>
        ) : null}
        <a
          href="https://www.weather.gov"
          className="underline text-primary"
          rel="noreferrer"
          target="_blank"
        >
          weather.gov
        </a>
      </div>
    </div>
  )
}

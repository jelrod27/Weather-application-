'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { nwsGeometryBBox } from '@/lib/warnings/alert-links'
import type { NWSAlertDetail } from '@/lib/services/nws-alerts-service'
import type { AlertsFeatureCollection } from '@/components/warnings/warnings-alert-map'

const WarningsAlertMap = dynamic(() => import('@/components/warnings/warnings-alert-map'), {
  ssr: false,
  loading: () => <p role="status">Loading warning area…</p>,
})

interface WarningAreaMapProps { alert: NWSAlertDetail }

export default function WarningAreaMap({ alert }: WarningAreaMapProps): React.JSX.Element {
  const geoJson = useMemo<AlertsFeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: alert.geometry, properties: { event: alert.event, severity: alert.severity, areaDesc: alert.areaDesc } }],
  }), [alert])
  return <section className="space-y-2">
    <h2 className="font-mono font-bold">Warning area</h2>
    {nwsGeometryBBox(alert.geometry)
      ? <WarningsAlertMap geoJson={geoJson} />
      : <p className="text-sm text-muted-foreground">No polygon was provided. Refer to the affected area and official instructions above.</p>}
  </section>
}

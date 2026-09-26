'use client'

import { RAINVIEWER_LEGEND } from '@/components/radar-v2/radar-constants'

interface RadarPrecipLegendProps {
  snowColorsEnabled: boolean
}

export function RadarPrecipLegend({ snowColorsEnabled }: RadarPrecipLegendProps): React.JSX.Element {
  return (
    <div
      data-testid="radar-precip-legend"
      className="pointer-events-none absolute bottom-[14rem] left-3 z-[2400] hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev)] px-3 py-2 shadow-lg sm:block"
    >
      <p className="mb-1.5 text-xs font-semibold text-[var(--text-muted)]">
        Rain intensity
      </p>
      <div className="flex flex-col gap-1">
        {RAINVIEWER_LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs text-[var(--text)]">
            <span
              className="h-2.5 w-8 rounded-sm border border-white/15"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium">{item.label}</span>
            <span className="text-[var(--text-muted)]">{item.value}</span>
          </div>
        ))}
      </div>
      {snowColorsEnabled ? (
        <p className="mt-1.5 max-w-40 text-xs leading-snug text-[var(--text-muted)]">
          Snow uses a separate RainViewer color scale.
        </p>
      ) : null}
    </div>
  )
}

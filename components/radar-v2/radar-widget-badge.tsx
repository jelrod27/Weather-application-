'use client'

interface RadarWidgetBadgeProps {
  updatedLabel: string | null
}

export function RadarWidgetBadge({ updatedLabel }: RadarWidgetBadgeProps) {
  return (
    <div
      data-testid="radar-widget-badge"
      className="pointer-events-none absolute left-2 top-2 z-[2000] rounded-md border border-white/10 bg-black/65 px-2 py-1 text-[10px] font-medium text-white/90 backdrop-blur-sm"
    >
      <span className="font-semibold uppercase tracking-wide text-cyan-200">Live radar</span>
      {updatedLabel ? <span className="text-white/70"> · {updatedLabel}</span> : null}
    </div>
  )
}

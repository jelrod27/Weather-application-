'use client'

interface RadarStatusChipProps {
  providerLabel: string
  updatedLabel: string
  freshnessClassName: string
  isPlaying: boolean
  isLiveFrame: boolean
}

export function RadarStatusChip({
  providerLabel,
  updatedLabel,
  freshnessClassName,
  isPlaying,
  isLiveFrame,
}: RadarStatusChipProps) {
  return (
    <div
      data-testid="radar-status-chip"
      className={`absolute left-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-[2000] flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-md sm:top-[calc(4.25rem+env(safe-area-inset-top))] ${freshnessClassName}`}
    >
      <span className="font-semibold uppercase tracking-wide">{providerLabel}</span>
      {updatedLabel ? <span className="text-white/80">· updated {updatedLabel}</span> : null}
      {isPlaying ? (
        <span className="rounded-full bg-cyan-500/30 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-100">
          Playing
        </span>
      ) : null}
      {isLiveFrame ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/25 px-2 py-0.5 text-[10px] font-bold uppercase text-red-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          Live
        </span>
      ) : null}
    </div>
  )
}

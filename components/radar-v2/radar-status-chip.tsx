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
    <div className={`absolute left-3 top-3 z-[2000] rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md ${freshnessClassName}`}>
      {isPlaying ? 'PLAYING' : isLiveFrame ? 'LIVE' : 'HISTORY'} {providerLabel} RADAR
      {updatedLabel ? ` · updated ${updatedLabel}` : ''}
    </div>
  )
}

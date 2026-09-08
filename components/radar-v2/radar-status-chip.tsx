'use client'

interface RadarStatusChipProps {
  updatedLabel: string
}

export function RadarStatusChip({
  updatedLabel,
}: RadarStatusChipProps) {
  return (
    <div
      data-testid="radar-status-chip"
      role="status"
      aria-live="polite"
      className="absolute left-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-[2000] max-w-[calc(100%-1.5rem)] rounded-full border border-amber-400/40 bg-amber-500/25 px-3 py-1.5 text-xs font-medium text-amber-50 backdrop-blur-md sm:top-[calc(4.25rem+env(safe-area-inset-top))]"
    >
      <span className="font-semibold">
        Updates delayed · showing last available frame
        {updatedLabel ? ` from ${updatedLabel}` : ''}
      </span>
    </div>
  )
}

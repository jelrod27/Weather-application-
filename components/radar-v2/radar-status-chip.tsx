'use client'

interface RadarStatusChipProps {
  updatedLabel: string
}

export function RadarStatusChip({
  updatedLabel,
}: RadarStatusChipProps): React.JSX.Element {
  return (
    <div
      data-testid="radar-status-chip"
      role="status"
      aria-live="polite"
      className="absolute left-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-[2000] max-w-[calc(100%-1.5rem)] rounded-lg border border-amber-500/50 bg-[var(--bg-elev)] px-3 py-1.5 text-xs font-medium text-[var(--text)]"
    >
      <span className="font-semibold">
        Updates delayed · showing last available frame
        {updatedLabel ? ` from ${updatedLabel}` : ''}
      </span>
    </div>
  )
}

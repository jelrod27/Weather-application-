'use client'

import { cn } from '@/lib/utils'

interface RadarPlaybackSpeedProps {
  speed: 0.5 | 1 | 2
  onSpeedChange: (speed: 0.5 | 1 | 2) => void
}

export function RadarPlaybackSpeed({ speed, onSpeedChange }: RadarPlaybackSpeedProps): React.JSX.Element {
  return (
    <div role="group" aria-label="Playback speed" className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg)] p-1">
      {([0.5, 1, 2] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onSpeedChange(value)}
          aria-pressed={speed === value}
          aria-label={`${value}x speed`}
          className={cn(
            'min-h-11 min-w-11 rounded-md px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            speed === value ? 'bg-primary text-primary-foreground' : 'text-[var(--text-muted)] hover:bg-[var(--bg-elev)]',
          )}
        >
          {value}x
        </button>
      ))}
    </div>
  )
}

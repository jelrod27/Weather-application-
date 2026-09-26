'use client'

import { cn } from '@/lib/utils'
import type { RadarPreset } from '@/lib/radar/radar-url-state'

interface RadarPresetBarProps {
  activePreset: RadarPreset
  onPresetChange: (preset: RadarPreset) => void
  onOpenLayers?: () => void
}

const PRESETS: Array<{ id: RadarPreset; label: string }> = [
  { id: 'radar', label: 'Radar' },
  { id: 'severe', label: 'Severe' },
  { id: 'outlook', label: 'Outlook' },
]

export function RadarPresetBar({ activePreset, onPresetChange, onOpenLayers }: RadarPresetBarProps): React.JSX.Element {
  return (
    <div className="pointer-events-auto flex items-center justify-between gap-2 bg-[var(--bg-elev)] px-3 py-2">
      <div role="group" aria-label="Radar preset" className="flex flex-1 flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPresetChange(preset.id)}
            aria-pressed={activePreset === preset.id}
            className={cn(
              'min-h-11 shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              activePreset === preset.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)]',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {onOpenLayers ? (
        <button
          type="button"
          onClick={onOpenLayers}
          aria-haspopup="dialog"
          className="min-h-11 shrink-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Layers
        </button>
      ) : null}
    </div>
  )
}

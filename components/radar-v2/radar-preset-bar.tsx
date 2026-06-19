'use client'

import type { RadarPreset } from '@/lib/radar/radar-url-state'

interface RadarPresetBarProps {
  activePreset: RadarPreset
  onPresetChange: (preset: RadarPreset) => void
  onOpenLayers: () => void
}

const PRESETS: Array<{ id: RadarPreset; label: string }> = [
  { id: 'radar', label: 'Radar' },
  { id: 'severe', label: 'Severe' },
  { id: 'outlook', label: 'Outlook' },
]

export function RadarPresetBar({ activePreset, onPresetChange, onOpenLayers }: RadarPresetBarProps) {
  return (
    <div className="pointer-events-auto flex items-center justify-between gap-2 border-t border-white/10 bg-zinc-950/90 px-3 py-2 backdrop-blur-md">
      <div className="flex flex-1 gap-2 overflow-x-auto">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPresetChange(preset.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activePreset === preset.id
                ? 'bg-cyan-500 text-white'
                : 'bg-white/5 text-zinc-300 hover:bg-white/10'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpenLayers}
        className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
      >
        Layers
      </button>
    </div>
  )
}

'use client'

import { useEffect, useId, useRef } from 'react'
import type { RadarShareLayerState, RadarTilePreferences } from '@/lib/radar/radar-url-state'
import { RAINVIEWER_COLOR_SCHEMES, RAINVIEWER_LEGEND } from '@/components/radar-v2/radar-constants'

interface RadarLayerSheetProps {
  open: boolean
  layers: RadarShareLayerState
  tilePreferences: RadarTilePreferences
  opacity: number
  alertCount: number
  spcCount: number
  stormReportCount: number
  onClose: () => void
  onLayersChange: (layers: RadarShareLayerState) => void
  onTilePreferencesChange: (preferences: RadarTilePreferences) => void
  onOpacityChange: (opacity: number) => void
}

export function RadarLayerSheet({
  open,
  layers,
  tilePreferences,
  opacity,
  alertCount,
  spcCount,
  stormReportCount,
  onClose,
  onLayersChange,
  onTilePreferencesChange,
  onOpacityChange,
}: RadarLayerSheetProps) {
  const titleId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-[3000] max-h-[80vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-950/98 p-4 shadow-2xl backdrop-blur-md"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 id={titleId} className="text-base font-semibold text-white">Layers</h2>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1 text-sm text-zinc-300 hover:bg-white/10"
        >
          Close
        </button>
      </div>

      <div className="space-y-4">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Radar</h3>
          <p className="mb-3 text-sm text-zinc-300">
            Global composite precipitation from RainViewer. Updates every few minutes with roughly two hours of history.
          </p>
          <label className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm text-white">
            <span>Precipitation</span>
            <input
              type="checkbox"
              checked={layers.precipitation}
              onChange={(event) => onLayersChange({ ...layers, precipitation: event.target.checked })}
            />
          </label>
          <div className="mt-3">
            <div className="mb-1 text-xs text-zinc-400">Opacity {Math.round(opacity * 100)}%</div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(event) => onOpacityChange(Number.parseFloat(event.target.value))}
              className="w-full accent-cyan-400"
              aria-label="Radar opacity"
            />
          </div>
        </section>

        <section className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm text-white">
            <span>Smooth radar</span>
            <input
              type="checkbox"
              checked={tilePreferences.smooth}
              onChange={(event) => onTilePreferencesChange({ ...tilePreferences, smooth: event.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm text-white">
            <span>Snow colors</span>
            <input
              type="checkbox"
              checked={tilePreferences.snow}
              onChange={(event) => onTilePreferencesChange({ ...tilePreferences, snow: event.target.checked })}
            />
          </label>
          <label className="flex flex-col gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white sm:col-span-2">
            <span>Color scheme</span>
            <select
              value={tilePreferences.colorScheme}
              onChange={(event) =>
                onTilePreferencesChange({
                  ...tilePreferences,
                  colorScheme: Number.parseInt(event.target.value, 10),
                })
              }
              className="rounded-md border border-white/10 bg-black/40 px-2 py-2 text-sm text-white"
              aria-label="Radar color scheme"
            >
              {RAINVIEWER_COLOR_SCHEMES.map((scheme) => (
                <option key={scheme.id} value={scheme.id}>
                  {scheme.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-400">
              Remaps the radar palette on your device. Changes apply instantly — no reload needed.
            </p>
          </label>
          <label className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm text-white sm:col-span-2">
            <span>Coverage mask</span>
            <input
              type="checkbox"
              checked={tilePreferences.coverage}
              onChange={(event) => onTilePreferencesChange({ ...tilePreferences, coverage: event.target.checked })}
            />
          </label>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Severe overlays</h3>
          <div className="space-y-2">
            <label className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm text-white">
              <span>NWS Alerts ({alertCount})</span>
              <input
                type="checkbox"
                checked={layers.alerts}
                onChange={(event) => onLayersChange({ ...layers, alerts: event.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm text-white">
              <span>SPC Outlook ({spcCount})</span>
              <input
                type="checkbox"
                checked={layers.spc}
                onChange={(event) => onLayersChange({ ...layers, spc: event.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm text-white">
              <span>Storm Reports ({stormReportCount})</span>
              <input
                type="checkbox"
                checked={layers.stormReports}
                onChange={(event) => onLayersChange({ ...layers, stormReports: event.target.checked })}
              />
            </label>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Legend</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {RAINVIEWER_LEGEND.map((item) => (
              <div key={item.value} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-xs text-zinc-200">
                <span className="h-3 w-6 rounded-sm border border-white/10" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

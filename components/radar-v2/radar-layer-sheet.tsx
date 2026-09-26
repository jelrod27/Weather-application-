'use client'

import { useRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { RAINVIEWER_LEGEND } from '@/components/radar-v2/radar-constants'
import type { ReactNode } from 'react'
import type { RadarShareLayerState, RadarTilePreferences } from '@/lib/radar/radar-url-state'

interface RadarLayerSheetProps {
  open: boolean
  mobileControls?: ReactNode
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
  mobileControls,
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
}: RadarLayerSheetProps): React.JSX.Element {
  const openerRef = useRef<HTMLElement | null>(null)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogPortal>
        <DialogOverlay className="z-[2999] bg-black/50" />
        <DialogPrimitive.Content
          onOpenAutoFocus={() => {
            openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          }}
          onCloseAutoFocus={(event) => {
            if (openerRef.current?.isConnected) {
              event.preventDefault()
              openerRef.current.focus()
            }
          }}
          className="fixed inset-x-0 bottom-0 z-[3000] mx-auto max-h-[85dvh] max-w-2xl overflow-y-auto overscroll-contain rounded-t-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-[var(--text)] shadow-2xl focus:outline-none"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-semibold">
              <span className="sm:hidden">Radar controls</span>
              <span className="hidden sm:inline">Layers</span>
            </DialogTitle>
            <DialogPrimitive.Close className="min-h-11 rounded-lg border border-[var(--border-subtle)] px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              Close
            </DialogPrimitive.Close>
          </div>
          <DialogDescription className="sr-only">
            Adjust radar layers and display preferences. Radar shows past observations, not predicted arrival times.
          </DialogDescription>
          {mobileControls ? <div className="mb-4 space-y-3 border-b border-[var(--border-subtle)] pb-4 sm:hidden">{mobileControls}</div> : null}
          <div className="space-y-4">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Radar</h3>
              <p className="mb-3 text-sm text-[var(--text-muted)]">
                Global composite precipitation from RainViewer. Updates every few minutes with roughly two hours of history. These are past observations, not a forecast or a rain arrival estimate.
              </p>
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]">
                <span>Precipitation</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  checked={layers.precipitation}
                  onChange={(event) => onLayersChange({ ...layers, precipitation: event.target.checked })}
                />
              </label>
              <div className="mt-3">
                <div className="mb-1 text-xs text-[var(--text-muted)]">Opacity {Math.round(opacity * 100)}%</div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={opacity}
                  onChange={(event) => onOpacityChange(Number.parseFloat(event.target.value))}
                  className="h-8 w-full accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  aria-label="Radar opacity"
                />
              </div>
            </section>

            <section className="grid gap-2 sm:grid-cols-2">
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]">
                <span>Smooth radar</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  checked={tilePreferences.smooth}
                  onChange={(event) => onTilePreferencesChange({ ...tilePreferences, smooth: event.target.checked })}
                />
              </label>
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]">
                <span>Snow colors</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  checked={tilePreferences.snow}
                  onChange={(event) => onTilePreferencesChange({ ...tilePreferences, snow: event.target.checked })}
                />
              </label>
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] sm:col-span-2">
                <span>Coverage mask</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  checked={tilePreferences.coverage}
                  onChange={(event) => onTilePreferencesChange({ ...tilePreferences, coverage: event.target.checked })}
                />
              </label>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Severe overlays</h3>
              <div className="space-y-2">
                <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]">
                  <span>NWS Alerts at location ({alertCount})</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    checked={layers.alerts}
                    onChange={(event) => onLayersChange({ ...layers, alerts: event.target.checked })}
                  />
                </label>
                <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]">
                  <span>SPC Outlook ({spcCount})</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    checked={layers.spc}
                    onChange={(event) => onLayersChange({ ...layers, spc: event.target.checked })}
                  />
                </label>
                <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]">
                  <span>Storm Reports ({stormReportCount})</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    checked={layers.stormReports}
                    onChange={(event) => onLayersChange({ ...layers, stormReports: event.target.checked })}
                  />
                </label>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Universal Blue rain legend
              </h3>
              {tilePreferences.snow ? (
                <p className="mb-2 text-xs text-[var(--text-muted)]">
                  Snow uses a separate RainViewer color scale.
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {RAINVIEWER_LEGEND.map((item) => (
                  <div key={item.value} className="flex items-center gap-2 rounded-lg bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--text)]">
                    <span className="h-3 w-6 rounded-sm border border-[var(--border-subtle)]" style={{ backgroundColor: item.color }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}

'use client'

import { RAINVIEWER_LEGEND } from '@/components/radar-v2/radar-constants'

export function RadarPrecipLegend() {
  return (
    <div
      data-testid="radar-precip-legend"
      className="pointer-events-none absolute bottom-[11.5rem] left-3 z-[2400] rounded-xl border border-white/10 bg-zinc-950/85 px-3 py-2 shadow-lg backdrop-blur-md sm:bottom-[12rem]"
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        Precipitation intensity
      </p>
      <div className="flex flex-col gap-1">
        {RAINVIEWER_LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-[11px] text-zinc-200">
            <span
              className="h-2.5 w-8 rounded-sm border border-white/15"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium">{item.label}</span>
            <span className="text-zinc-500">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

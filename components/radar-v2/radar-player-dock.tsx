'use client'

import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { formatRainViewerHistoryLabel } from '@/lib/radar/rainviewer'

interface RadarPlayerDockProps {
  frameIndex: number
  frameCount: number
  isPlaying: boolean
  isLiveFrame: boolean
  relativeTime: string
  speed: 0.5 | 1 | 2
  onPlayPause: () => void
  onSkipToStart: () => void
  onSkipToEnd: () => void
  onSpeedChange: (speed: 0.5 | 1 | 2) => void
  onFrameChange: (index: number) => void
  onLiveTap: () => void
}

export function RadarPlayerDock({
  frameIndex,
  frameCount,
  isPlaying,
  isLiveFrame,
  relativeTime,
  speed,
  onPlayPause,
  onSkipToStart,
  onSkipToEnd,
  onSpeedChange,
  onFrameChange,
  onLiveTap,
}: RadarPlayerDockProps) {
  const maxIndex = Math.max(0, frameCount - 1)
  const progress = maxIndex > 0 ? (frameIndex / maxIndex) * 100 : 100
  const historyLabel = formatRainViewerHistoryLabel(frameCount)

  return (
    <div
      data-testid="radar-player-dock"
      className="pointer-events-auto border-t border-white/10 bg-zinc-950/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onSkipToStart}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10"
            aria-label="Go to start"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onPlayPause}
            className="inline-flex h-11 min-w-[96px] items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-4 text-sm font-semibold text-white hover:bg-cyan-500/30"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            type="button"
            onClick={onSkipToEnd}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10"
            aria-label="Go to live frame"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            {[0.5, 1, 2].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onSpeedChange(value as 0.5 | 1 | 2)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  speed === value ? 'bg-cyan-500 text-white' : 'text-zinc-300 hover:bg-white/10'
                }`}
              >
                {value}x
              </button>
            ))}
          </div>

          <div className="min-w-[88px] text-center text-sm font-medium text-zinc-200">{relativeTime}</div>

          <button
            type="button"
            onClick={onLiveTap}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              isLiveFrame ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isLiveFrame ? 'animate-pulse bg-red-500' : 'bg-zinc-500'}`} />
            Live
          </button>
        </div>

        <div className="px-1">
          <input
            type="range"
            min={0}
            max={maxIndex}
            value={frameIndex}
            onChange={(event) => onFrameChange(Number.parseInt(event.target.value, 10))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-cyan-400"
            aria-label="Radar timeline"
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{historyLabel}</span>
            <span>
              Frame {frameIndex + 1} / {frameCount}
            </span>
            <span className={isLiveFrame ? 'font-semibold text-red-300' : ''}>{isLiveFrame ? 'LIVE' : 'NOW'}</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-500">
          Source:{' '}
          <a href="https://www.rainviewer.com/" className="text-cyan-300 hover:underline" target="_blank" rel="noreferrer">
            RainViewer
          </a>
        </p>
      </div>
    </div>
  )
}

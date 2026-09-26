'use client'

import { Pause, Play, SkipBack, SkipForward, SlidersHorizontal } from 'lucide-react'
import { formatRainViewerHistoryLabel } from '@/lib/radar/rainviewer'
import { cn } from '@/lib/utils'
import { RadarPlaybackSpeed } from '@/components/radar-v2/radar-playback-speed'

interface RadarPlayerDockProps {
  frameIndex: number
  frameCount: number
  isPlaying: boolean
  isLiveFrame: boolean
  relativeTime: string
  frameTimeLabel?: string
  frameIsoTime?: string
  speed: 0.5 | 1 | 2
  controlsOpen?: boolean
  onOpenControls?: () => void
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
  frameTimeLabel,
  frameIsoTime,
  speed,
  controlsOpen,
  onOpenControls,
  onPlayPause,
  onSkipToStart,
  onSkipToEnd,
  onSpeedChange,
  onFrameChange,
  onLiveTap,
}: RadarPlayerDockProps): React.JSX.Element {
  const maxIndex = Math.max(0, frameCount - 1)
  const historyLabel = formatRainViewerHistoryLabel(frameCount)
  const frameDescription = [frameTimeLabel, relativeTime].filter(Boolean).join(' · ')
  const iconButtonClass = 'hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--bg-elev)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:inline-flex'

  return (
    <div
      data-testid="radar-player-dock"
      className="pointer-events-auto border-t border-[var(--border-subtle)] bg-[var(--bg-elev)] px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-[var(--text)]"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-1.5 sm:gap-2">
        <div className="flex items-center gap-2 sm:flex-wrap sm:justify-center">
          <button type="button" onClick={onSkipToStart} className={iconButtonClass} aria-label="Go to start">
            <SkipBack className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onPlayPause}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {isPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button type="button" onClick={onSkipToEnd} className={iconButtonClass} aria-label="Go to latest frame">
            <SkipForward className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="hidden sm:block">
            <RadarPlaybackSpeed speed={speed} onSpeedChange={onSpeedChange} />
          </div>

          <div className="min-w-0 flex-1 text-center leading-tight sm:flex-none sm:px-2">
            {frameTimeLabel ? <time dateTime={frameIsoTime} className="block text-xs font-semibold sm:text-sm">{frameTimeLabel}</time> : null}
            <span className="text-xs text-[var(--text-muted)]">{relativeTime}</span>
          </div>

          <button
            type="button"
            onClick={onLiveTap}
            aria-pressed={isLiveFrame}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              isLiveFrame ? 'bg-primary/10 text-primary' : 'bg-[var(--bg)] text-[var(--text-muted)]',
            )}
          >
            Latest
          </button>

          {onOpenControls ? (
            <button
              type="button"
              onClick={onOpenControls}
              aria-haspopup="dialog"
              aria-expanded={controlsOpen}
              className="inline-flex min-h-11 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Controls
            </button>
          ) : null}
        </div>

        <div className="px-1">
          <input
            type="range"
            min={0}
            max={maxIndex}
            value={frameIndex}
            onChange={(event) => onFrameChange(Number.parseInt(event.target.value, 10))}
            className="block h-6 w-full cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Radar timeline"
            aria-valuetext={frameDescription}
          />
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{historyLabel}</span>
            <span>Frame {frameIndex + 1} / {frameCount}</span>
            <span>Latest available</span>
          </div>
        </div>

        <p className="text-center text-xs leading-relaxed text-[var(--text-muted)]">
          Source:{' '}
          <a href="https://www.rainviewer.com/" className="text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" target="_blank" rel="noreferrer">
            RainViewer
          </a>
          {' · '}Past observations, not a forecast.
        </p>
      </div>
    </div>
  )
}

import type { RadarFrame } from '@/lib/radar/radar-timestamps'
import type { RainViewerPastFrame } from '@/lib/radar/rainviewer/types'
import { RAINVIEWER_FRAME_STEP_MINUTES } from '@/lib/radar/rainviewer/constants'

export function buildFramesFromRainViewerPast(past: RainViewerPastFrame[]): RadarFrame[] {
  if (past.length === 0) return []

  const sorted = [...past].sort((a, b) => a.time - b.time)
  const liveIndex = sorted.length - 1
  const liveTime = sorted[liveIndex].time

  return sorted.map((frame, index) => {
    const offsetMinutes = index === liveIndex
      ? 0
      : -Math.round((liveTime - frame.time) / 60)

    return {
      timestamp: frame.time * 1000,
      isoTime: new Date(frame.time * 1000).toISOString(),
      epochSeconds: frame.time,
      offsetMinutes,
      isLive: index === liveIndex,
      tilePath: frame.path,
    }
  })
}

export function getRainViewerHistoryLabelMinutes(frameCount: number): number {
  const minutes = Math.max(0, (frameCount - 1) * RAINVIEWER_FRAME_STEP_MINUTES)
  if (minutes >= 60) {
    const hours = minutes / 60
    return Number.isInteger(hours) ? hours * 60 : minutes
  }
  return minutes
}

export function formatRainViewerHistoryLabel(frameCount: number): string {
  const minutes = getRainViewerHistoryLabelMinutes(frameCount)
  if (minutes >= 60 && minutes % 60 === 0) {
    return `-${minutes / 60}h`
  }
  return `-${minutes}m`
}

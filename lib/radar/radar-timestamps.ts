export interface BuildRadarFramesOptions {
  now?: number
  stepMinutes?: number
  pastMinutes?: number
  pastSteps?: number
}

export interface RadarFrame {
  timestamp: number
  isoTime: string
  epochSeconds: number
  offsetMinutes: number
  isLive: boolean
  tilePath?: string
}

const DEFAULT_STEP_MINUTES = 5
const DEFAULT_PAST_MINUTES = 240
const MAX_PAST_MINUTES = 12 * 60

export function normalizeRadarStepMinutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_STEP_MINUTES
  }
  return Math.max(1, Math.round(value))
}

export function normalizeRadarPastMinutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return DEFAULT_PAST_MINUTES
  }
  return Math.min(MAX_PAST_MINUTES, Math.round(value))
}

function quantizeTime(ms: number, stepMinutes: number): number {
  const stepMs = stepMinutes * 60 * 1000
  return Math.floor(ms / stepMs) * stepMs
}

export function buildRadarFrames(options: BuildRadarFramesOptions = {}): RadarFrame[] {
  const stepMinutes = normalizeRadarStepMinutes(options.stepMinutes)
  const now = typeof options.now === 'number' && Number.isFinite(options.now)
    ? options.now
    : Date.now()
  const base = quantizeTime(now, stepMinutes)
  const pastSteps = typeof options.pastSteps === 'number' && Number.isFinite(options.pastSteps)
    ? Math.max(0, Math.floor(options.pastSteps))
    : Math.floor(normalizeRadarPastMinutes(options.pastMinutes) / stepMinutes)

  const frames: RadarFrame[] = []
  for (let i = pastSteps; i >= 0; i -= 1) {
    const timestamp = base - i * stepMinutes * 60 * 1000
    frames.push({
      timestamp,
      isoTime: new Date(timestamp).toISOString(),
      epochSeconds: Math.floor(timestamp / 1000),
      offsetMinutes: i === 0 ? 0 : -i * stepMinutes,
      isLive: i === 0,
    })
  }
  return frames
}

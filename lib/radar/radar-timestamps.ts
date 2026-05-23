import { RADAR_PAST_STEPS, RADAR_STEP_MINUTES } from './radar-config'

export interface BuildRadarTimestampsOptions {
  nowMs?: number
  stepMinutes?: number
  pastSteps?: number
}

/** Quantize a timestamp down to the nearest radar frame boundary. */
export function quantizeRadarTime(
  ms: number,
  stepMinutes: number = RADAR_STEP_MINUTES
): number {
  const stepMs = stepMinutes * 60 * 1000
  return Math.floor(ms / stepMs) * stepMs
}

/** Build ascending UTC frame timestamps ending at the latest quantized "now". */
export function buildRadarTimestamps(
  options: BuildRadarTimestampsOptions = {}
): number[] {
  const stepMinutes = options.stepMinutes ?? RADAR_STEP_MINUTES
  const pastSteps = options.pastSteps ?? RADAR_PAST_STEPS
  const base = quantizeRadarTime(options.nowMs ?? Date.now(), stepMinutes)
  const stepMs = stepMinutes * 60 * 1000
  const times: number[] = []

  for (let i = pastSteps; i >= 0; i -= 1) {
    times.push(base - i * stepMs)
  }

  return times
}

/** Minutes between frame time and real now (for "Updated X ago"). */
export function minutesSinceFrame(frameMs: number, nowMs: number = Date.now()): number {
  return Math.max(0, Math.round((nowMs - frameMs) / 60_000))
}

/** Frame index to start a "last N hours" playback ending at live. */
export function stormWatchStartIndex(
  frameCount: number,
  framesBack: number = (2 * 60) / RADAR_STEP_MINUTES
): number {
  if (frameCount <= 0) return 0
  return Math.max(0, frameCount - 1 - framesBack)
}

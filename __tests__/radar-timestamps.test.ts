import {
  buildRadarFrames,
  formatRadarFrameAgeLabel,
  normalizeRadarPastMinutes,
  normalizeRadarStepMinutes,
} from '@/lib/radar/radar-timestamps'

describe('radar timestamps', () => {
  const now = Date.UTC(2026, 5, 18, 21, 43, 22)

  it('builds finite ordered frames quantized to the provider step', () => {
    const frames = buildRadarFrames({ now, stepMinutes: 5, pastMinutes: 15 })

    expect(frames).toHaveLength(4)
    expect(frames[0].isoTime).toBe('2026-06-18T21:25:00.000Z')
    expect(frames[3].isoTime).toBe('2026-06-18T21:40:00.000Z')
    expect(frames[3].isLive).toBe(true)
    expect(frames.every((frame) => Number.isFinite(frame.timestamp))).toBe(true)
  })

  it('sanitizes invalid step and history inputs', () => {
    expect(normalizeRadarStepMinutes(0)).toBe(5)
    expect(normalizeRadarStepMinutes(Number.NaN)).toBe(5)
    expect(normalizeRadarPastMinutes(-1)).toBe(240)
    expect(normalizeRadarPastMinutes(Number.POSITIVE_INFINITY)).toBe(240)

    const frames = buildRadarFrames({
      now,
      stepMinutes: Number.NaN,
      pastMinutes: Number.NaN,
    })

    expect(frames).toHaveLength(49)
    expect(frames.every((frame) => Number.isFinite(frame.timestamp))).toBe(true)
  })

  it('honors explicit pastSteps when provided', () => {
    const frames = buildRadarFrames({ now, stepMinutes: 10, pastSteps: 2 })

    expect(frames).toHaveLength(3)
    expect(frames.map((frame) => frame.offsetMinutes)).toEqual([-20, -10, 0])
  })

  it('formats historical frame age from the current time, not the newest frame', () => {
    expect(formatRadarFrameAgeLabel({
      timestamp: now - (25 * 60 * 1000),
      isoTime: new Date(now - (25 * 60 * 1000)).toISOString(),
      epochSeconds: Math.floor((now - (25 * 60 * 1000)) / 1000),
      offsetMinutes: -10,
      isLive: false,
    }, now)).toBe('25m ago')
  })

  it('shows elapsed age even for the newest available frame', () => {
    expect(formatRadarFrameAgeLabel({
      timestamp: now - (15 * 60 * 1000),
      isoTime: new Date(now - (15 * 60 * 1000)).toISOString(),
      epochSeconds: Math.floor((now - (15 * 60 * 1000)) / 1000),
      offsetMinutes: 0,
      isLive: true,
    }, now)).toBe('15m ago')
  })
})


it('handles unavailable frames and future clock skew without negative ages', () => {
  expect(formatRadarFrameAgeLabel(undefined, 100)).toBe('—')
  const frame = buildRadarFrames({ now: 120000 })[0]
  expect(formatRadarFrameAgeLabel({ ...frame, timestamp: Number.NaN }, 0)).toBe('—')
  expect(formatRadarFrameAgeLabel({ ...frame, timestamp: 120000, isLive: true }, 110000)).toBe('0m ago')
})

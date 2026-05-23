import { RADAR_STEP_MINUTES, US_RADAR_SOURCE_ID, INTL_RADAR_SOURCE_ID } from '@/lib/radar/radar-config'
import {
  buildRadarTimestamps,
  minutesSinceFrame,
  quantizeRadarTime,
  stormWatchStartIndex,
} from '@/lib/radar/radar-timestamps'
import { parseRainViewerMapsPayload, rainViewerTileUrl } from '@/lib/radar/rainviewer-types'

describe('radar config', () => {
  it('should expose stable US and international source ids', () => {
    expect(US_RADAR_SOURCE_ID).toBe('iowa-wms-t')
    expect(INTL_RADAR_SOURCE_ID).toBe('rainviewer')
    expect(RADAR_STEP_MINUTES).toBe(5)
  })
})

describe('radar timestamps', () => {
  it('should quantize to 5-minute boundaries', () => {
    const ms = new Date('2026-05-22T14:07:30.000Z').getTime()
    const quantized = quantizeRadarTime(ms, 5)
    expect(new Date(quantized).toISOString()).toBe('2026-05-22T14:05:00.000Z')
  })

  it('should build 49 frames for default 4-hour US window', () => {
    const now = new Date('2026-05-22T15:00:00.000Z').getTime()
    const frames = buildRadarTimestamps({ nowMs: now })
    expect(frames).toHaveLength(49)
    expect(frames[0]).toBe(now - 48 * 5 * 60 * 1000)
    expect(frames[frames.length - 1]).toBe(now)
  })

  it('should compute minutes since latest frame', () => {
    const frame = Date.now() - 8 * 60 * 1000
    expect(minutesSinceFrame(frame)).toBe(8)
  })

  it('should compute storm watch start index for 2 hours', () => {
    expect(stormWatchStartIndex(49, 24)).toBe(24)
    expect(stormWatchStartIndex(10, 24)).toBe(0)
  })

  it('should fall back to defaults for invalid step and past options', () => {
    const now = new Date('2026-05-22T15:00:00.000Z').getTime()
    const frames = buildRadarTimestamps({
      nowMs: now,
      stepMinutes: 0,
      pastSteps: -5,
    })
    expect(frames).toHaveLength(49)
    expect(frames.every((frame) => Number.isFinite(frame))).toBe(true)
  })
})

describe('rainviewer parsing', () => {
  it('should parse public API shape', () => {
    const parsed = parseRainViewerMapsPayload({
      host: 'https://tilecache.rainviewer.com',
      radar: {
        past: [
          { time: 1000, path: '/v2/radar/1000/256/{z}/{x}/{y}/2/1_1.png' },
          { time: 2000, path: '/v2/radar/2000/256/{z}/{x}/{y}/2/1_1.png' },
        ],
      },
    })

    expect(parsed?.host).toBe('https://tilecache.rainviewer.com')
    expect(parsed?.past).toHaveLength(2)
    expect(parsed?.past[0]?.time).toBe(1000)
  })

  it('should build tile URLs from path templates', () => {
    const url = rainViewerTileUrl(
      'https://tilecache.rainviewer.com',
      '/v2/radar/1000/256/{z}/{x}/{y}/2/1_1.png',
      8,
      41,
      23
    )
    expect(url).toBe(
      'https://tilecache.rainviewer.com/v2/radar/1000/256/8/41/23/2/1_1.png'
    )
  })
})

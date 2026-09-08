import { act, renderHook, waitFor } from '@testing-library/react'
import {
  MANIFEST_REFRESH_MS,
  RADAR_OVERLAY_REFRESH_MS,
} from '@/components/radar-v2/radar-constants'
import {
  parseRadarUrlState,
  type RadarMetadata,
} from '@/lib/radar'
import {
  useRadarOverlayLoader,
  type UseRadarOverlayLoaderProps,
} from '@/hooks/useRadarOverlayLoader'

jest.mock('@/components/radar-v2/radar-styles', () => ({
  alertStyle: () => undefined,
  spcStyle: () => undefined,
  stormReportStyle: () => undefined,
}))
jest.mock('ol/layer/Tile', () => ({ __esModule: true, default: class TileLayer {} }))
jest.mock('ol/layer/Vector', () => ({ __esModule: true, default: class VectorLayer {} }))
jest.mock('ol/source/Vector', () => ({ __esModule: true, default: class VectorSource {} }))
jest.mock('ol/source/XYZ', () => ({ __esModule: true, default: class XYZ {} }))
jest.mock('ol/Feature', () => ({ __esModule: true, default: class Feature {} }))
jest.mock('ol/geom/Point', () => ({ __esModule: true, default: class Point {} }))
jest.mock('ol/format/GeoJSON', () => ({ __esModule: true, default: class GeoJSON {} }))
jest.mock('ol/proj', () => ({ fromLonLat: (coordinates: number[]) => coordinates }))

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

const metadata: RadarMetadata = {
  location: { lat: 35.47, lon: -97.52 },
  generatedAt: '2026-09-08T12:00:00.000Z',
  selectedProvider: {
    id: 'rainviewer',
    displayName: 'RainViewer Radar',
    shortName: 'RainViewer',
    coverage: 'global',
    protocol: 'xyz',
    attribution: 'RainViewer',
    refreshIntervalSeconds: 300,
    frameStepMinutes: 10,
    pastMinutes: 120,
    supportsAnimation: true,
    qualityTier: 'community',
    notes: ['Global composite radar tiles from RainViewer.'],
  },
  frames: [
    {
      timestamp: 1_788_868_800_000,
      isoTime: '2026-09-08T12:00:00.000Z',
      epochSeconds: 1_788_868_800,
      offsetMinutes: 0,
      isLive: true,
      tilePath: '/v2/radar/1788868800',
    },
  ],
  refreshIntervalSeconds: 300,
  legend: [],
  selectionReason: 'RainViewer global composite selected for US coverage region.',
  coverageRegion: 'us',
  rainviewer: {
    host: 'https://tilecache.rainviewer.com',
    generated: 1_788_868_800,
    version: '2.0',
    colorScheme: 2,
    smooth: true,
    snow: true,
    tileSize: 512,
  },
}

const props: UseRadarOverlayLoaderProps = {
  latitude: 35.47,
  longitude: -97.52,
  isFullPage: true,
  isWidget: false,
  parsedUrlStateRef: { current: parseRadarUrlState(new URLSearchParams()) },
  mapInstanceRef: { current: null },
  radarLayerRef: { current: null },
  coverageLayerRef: { current: null },
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useRadarOverlayLoader refresh behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    Reflect.deleteProperty(globalThis, 'fetch')
    jest.useRealTimers()
  })

  it('serializes overlay polls and retains last-good data when refreshes fail', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    let metadataRequests = 0
    let overlayRequests = 0
    let releasePendingAlert: (response: Response) => void = () => undefined
    const pendingAlert = new Promise<Response>((resolve) => {
      releasePendingAlert = resolve
    })

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('/api/radar/metadata')) {
        metadataRequests += 1
        return metadataRequests === 1
          ? jsonResponse(metadata)
          : jsonResponse({ error: 'temporarily unavailable' }, 503)
      }

      overlayRequests += 1
      if (overlayRequests === 4) return pendingAlert
      if (overlayRequests === 5 || overlayRequests === 6) {
        return jsonResponse({ error: 'temporarily unavailable' }, 503)
      }
      if (url.includes('/api/weather/alerts')) {
        return jsonResponse({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: null, properties: { event: 'Warning' } }],
        })
      }
      if (url.includes('/api/weather/spc-outlook')) {
        return jsonResponse({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: null, properties: { label: 'Marginal' } }],
        })
      }
      return jsonResponse({
        reports: [{
          category: 'hail',
          time: '2100',
          size: '1.00',
          location: 'Oklahoma City',
          state: 'OK',
          lat: 35.47,
          lon: -97.52,
          comments: 'Hail report',
          date: '2026-09-08',
        }],
      })
    })
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    })

    const { result, unmount } = renderHook(() => useRadarOverlayLoader(props))
    await flushPromises()

    await waitFor(() => {
      expect(result.current.metadata).toEqual(metadata)
      expect(result.current.alertsGeoJson?.features).toHaveLength(1)
      expect(result.current.spcGeoJson?.features).toHaveLength(1)
      expect(result.current.stormReports).toHaveLength(1)
    })

    await act(async () => {
      jest.advanceTimersByTime(RADAR_OVERLAY_REFRESH_MS)
      await Promise.resolve()
    })
    expect(overlayRequests).toBe(6)

    await act(async () => {
      jest.advanceTimersByTime(RADAR_OVERLAY_REFRESH_MS)
      await Promise.resolve()
    })
    expect(overlayRequests).toBe(6)

    releasePendingAlert(jsonResponse({ error: 'temporarily unavailable' }, 503))
    await flushPromises()

    await act(async () => {
      jest.advanceTimersByTime(MANIFEST_REFRESH_MS - (RADAR_OVERLAY_REFRESH_MS * 2))
      await Promise.resolve()
    })
    await flushPromises()

    expect(result.current.metadata).toEqual(metadata)
    expect(result.current.metadataError).toBe('Radar is temporarily unavailable. Try again shortly.')
    expect(result.current.alertsGeoJson?.features).toHaveLength(1)
    expect(result.current.spcGeoJson?.features).toHaveLength(1)
    expect(result.current.stormReports).toHaveLength(1)

    const requestsBeforeUnmount = overlayRequests
    unmount()
    jest.advanceTimersByTime(RADAR_OVERLAY_REFRESH_MS * 2)
    expect(overlayRequests).toBe(requestsBeforeUnmount)
  })

  it('waits for a metadata refresh to settle before scheduling the next one', async () => {
    let metadataRequests = 0
    let releasePendingMetadata: (response: Response) => void = () => undefined
    const pendingMetadata = new Promise<Response>((resolve) => {
      releasePendingMetadata = resolve
    })

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/radar/metadata')) {
        metadataRequests += 1
        return metadataRequests === 1 ? jsonResponse(metadata) : pendingMetadata
      }
      if (url.includes('/api/weather/alerts') || url.includes('/api/weather/spc-outlook')) {
        return jsonResponse({ type: 'FeatureCollection', features: [] })
      }
      return jsonResponse({ reports: [] })
    })
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    })

    const { result, unmount } = renderHook(() => useRadarOverlayLoader(props))
    await flushPromises()
    await waitFor(() => expect(result.current.metadata).toEqual(metadata))

    await act(async () => {
      jest.advanceTimersByTime(MANIFEST_REFRESH_MS)
      await Promise.resolve()
    })
    expect(metadataRequests).toBe(2)

    await act(async () => {
      jest.advanceTimersByTime(MANIFEST_REFRESH_MS)
      await Promise.resolve()
    })
    expect(metadataRequests).toBe(2)

    releasePendingMetadata(jsonResponse(metadata))
    await flushPromises()

    unmount()
    jest.advanceTimersByTime(MANIFEST_REFRESH_MS)
    expect(metadataRequests).toBe(2)
  })
})

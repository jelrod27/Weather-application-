import { fetchRadarOverlaySnapshot } from '@/lib/radar/radar-overlay-client'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

describe('fetchRadarOverlaySnapshot', () => {
  it('returns successful feeds when one overlay endpoint fails', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)

      if (url.includes('/api/weather/alerts')) {
        return jsonResponse({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [[[-97.6, 35.4], [-97.4, 35.4], [-97.5, 35.6], [-97.6, 35.4]]],
              },
              properties: { event: 'Severe Thunderstorm Warning' },
            },
          ],
        })
      }

      if (url.includes('/api/weather/spc-outlook')) {
        return jsonResponse({ error: 'temporarily unavailable' }, 503)
      }

      return jsonResponse({
        reports: [
          {
            category: 'hail',
            time: '2100',
            size: '1.00',
            location: 'Oklahoma City',
            state: 'OK',
            lat: 35.47,
            lon: -97.52,
            comments: 'Quarter-size hail',
            date: '2026-09-08',
          },
        ],
      })
    }

    const signal = new AbortController().signal
    const snapshot = await fetchRadarOverlaySnapshot(35.47, -97.52, signal, fetchImpl)

    expect(snapshot.alerts?.features).toHaveLength(1)
    expect(snapshot.spc).toBeUndefined()
    expect(snapshot.stormReports).toHaveLength(1)
  })
})

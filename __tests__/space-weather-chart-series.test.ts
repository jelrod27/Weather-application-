/**
 * Unwrapping a chart series from a space-weather API response.
 *
 * Every route under app/api/space-weather answers with a `{ data, source }`
 * envelope, but SpaceWeatherCharts read the parsed body *as* the series and
 * gated on `Array.isArray`. An object is not an array, so the plasma, proton
 * flux and magnetometer charts resolved to `[]` on every load and had never
 * plotted a point on the site's highest-impression page.
 */

import { chartSeries, xrayChartSeries } from '@/lib/space-weather/chart-series'

const ok = (value: unknown): PromiseSettledResult<unknown> => ({
  status: 'fulfilled',
  value,
})

const rejected: PromiseSettledResult<unknown> = {
  status: 'rejected',
  reason: new Error('upstream down'),
}

describe('chartSeries', () => {
  it('reads the series out of the envelope the routes actually send', () => {
    // The exact shape of /api/space-weather/plasma, extra keys and all.
    const body = {
      data: [{ time: '2026-09-08T15:54:00', speed: 485, density: 6.7 }],
      range: '2h',
      source: 'NOAA Space Weather Prediction Center (RTSW)',
      magneticAvailable: true,
    }

    expect(chartSeries(ok(body))).toEqual([
      { time: '2026-09-08T15:54:00', speed: 485, density: 6.7 },
    ])
  })

  it('handles the shared series-route envelope', () => {
    // proton-flux and magnetometer both go through swpcSeriesRoute.
    const body = { data: [{ time: '2026-09-08T15:54:00', flux: 0.21 }], source: 'GOES' }

    expect(chartSeries(ok(body))).toHaveLength(1)
  })

  it('still accepts a bare array, so a route dropping its envelope keeps working', () => {
    expect(chartSeries(ok([{ time: 't', speed: 1 }]))).toHaveLength(1)
  })

  it('returns an empty series rather than throwing on anything unusable', () => {
    expect(chartSeries(rejected)).toEqual([])
    expect(chartSeries(ok(null))).toEqual([])
    expect(chartSeries(ok({ error: 'Unable to build plasma series' }))).toEqual([])
    expect(chartSeries(ok({ data: null }))).toEqual([])
    expect(chartSeries(ok({ data: { recent: [] } }))).toEqual([])
  })
})

describe('xrayChartSeries', () => {
  it('reaches into the summary object and renames timeTag to time', () => {
    // /api/space-weather/xray-flux returns a summary at `data`, not a series.
    const body = {
      data: {
        timestamp: '2026-09-08T16:15:00.000Z',
        current: { flux: 5.2e-7, flareClass: 'B', classNumber: 'B5.2' },
        recent: [
          { timeTag: '2026-09-08T15:54:00', flux: 5.2e-7 },
          { timeTag: '2026-09-08T15:55:00', flux: 5.4e-7 },
        ],
        peakLast24h: null,
      },
      source: 'NOAA SWPC (GOES Satellite)',
    }

    expect(xrayChartSeries(ok(body))).toEqual([
      { time: '2026-09-08T15:54:00', flux: 5.2e-7 },
      { time: '2026-09-08T15:55:00', flux: 5.4e-7 },
    ])
  })

  it('prefers a plain envelope if the route is ever normalized', () => {
    const body = { data: [{ time: '2026-09-08T15:54:00', flux: 1e-6 }], source: 'GOES' }

    expect(xrayChartSeries(ok(body))).toEqual([
      { time: '2026-09-08T15:54:00', flux: 1e-6 },
    ])
  })

  it('returns an empty series for the route error payload', () => {
    // The 500 branch still sends a `data` object, with recent: [].
    const body = {
      data: { timestamp: '', current: { flux: 0 }, recent: [], peakLast24h: null },
      source: 'NOAA SWPC',
      error: 'Unable to fetch live data',
    }

    expect(xrayChartSeries(ok(body))).toEqual([])
    expect(xrayChartSeries(rejected)).toEqual([])
  })
})

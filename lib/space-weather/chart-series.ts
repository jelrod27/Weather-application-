/**
 * Pulling a chart series out of a space-weather API response.
 *
 * Every route under `app/api/space-weather` answers with an envelope —
 * `{ data, source }`, plus per-route extras like `range` — but
 * `SpaceWeatherCharts` read the parsed body *as* the series and gated on
 * `Array.isArray`. An object is not an array, so plasma, proton flux and
 * magnetometer each resolved to `[]` on every load and their three charts had
 * never plotted a point. Only the X-ray chart worked, because it alone carried
 * an inline fallback that reached into `.data`.
 *
 * The unwrapping lives here, once, so a fifth chart cannot reintroduce the same
 * bug by hand-rolling its own branch — and so it can be tested without
 * mounting a Recharts tree.
 */

/** A chart point as the components consume it: opaque keys read by config. */
export type ChartPoint = Record<string, unknown>

function bodyOf(result: PromiseSettledResult<unknown>): unknown {
  return result.status === 'fulfilled' ? result.value : null
}

/**
 * The series in a `{ data: [...] }` envelope.
 *
 * A bare array is accepted too, so a route that stops wrapping its payload
 * keeps working rather than silently emptying its chart — the failure mode
 * this function exists to prevent.
 */
export function chartSeries(result: PromiseSettledResult<unknown>): ChartPoint[] {
  const body = bodyOf(result)
  if (Array.isArray(body)) return body as ChartPoint[]

  const data = (body as { data?: unknown } | null)?.data
  return Array.isArray(data) ? (data as ChartPoint[]) : []
}

/**
 * The X-ray series, which is shaped unlike the other three.
 *
 * `/api/space-weather/xray-flux` returns a summary object at `data` — current
 * class, peak, and a `recent` array keyed `timeTag`/`flux` — rather than the
 * series itself. Falls through the ordinary envelope shapes first so the route
 * can be normalized later without touching this.
 */
export function xrayChartSeries(result: PromiseSettledResult<unknown>): ChartPoint[] {
  const direct = chartSeries(result)
  if (direct.length > 0) return direct

  const recent = (bodyOf(result) as { data?: { recent?: unknown } } | null)?.data?.recent
  if (!Array.isArray(recent)) return []

  return (recent as ChartPoint[]).map((point) => ({ time: point.timeTag, flux: point.flux }))
}

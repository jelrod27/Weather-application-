import type { LocalWinterForecast } from '@/lib/winter/local-types'
import type { WinterMapSelection, WinterMapSnapshot } from '@/lib/winter/types'

export function winterOutlookFixture(selection: WinterMapSelection, now = Date.now()): WinterMapSnapshot {
  const at = (hours: number): string => new Date(now + hours * 3_600_000).toISOString()
  const impacts = selection.product === 'impacts'
  const label = impacts ? 'Moderate impacts' : 'Moderate · 40–69%'
  const color = impacts ? '#fb923c' : '#818cf8'
  return {
    selection, source: 'NOAA / NWS Weather Prediction Center', sourceUrl: 'https://www.wpc.ncep.noaa.gov/wwd/winter_wx.shtml',
    coverage: 'Contiguous United States', status: 'available', issuedAt: at(-1),
    validFrom: at((selection.day - 1) * 24), validTo: at(selection.day * 24), fetchedAt: at(0), message: null,
    legend: [{ label, color }], contours: { type: 'FeatureCollection', features: [{
      type: 'Feature', properties: { category: impacts ? 'MODERATE' : 'Moderate (40-69%)', label, color, rank: 2 },
      geometry: { type: 'Polygon', coordinates: [[[-108, 39], [-99, 39], [-99, 45], [-108, 45], [-108, 39]]] },
    }] },
  }
}

export function winterLocalFixture(now = Date.now()): LocalWinterForecast {
  const at = (hours: number): string => new Date(now + hours * 3_600_000).toISOString()
  const period = { startTime: at(1), endTime: at(2), shortForecast: 'Snow and freezing rain', temperatureF: 28,
    windSpeed: '10 to 15 mph', windDirection: 'NE', precipitationProbability: 70, ongoing: false }
  return {
    status: 'partial', coverage: 'conus', place: { name: 'Denver, CO', lat: 39.7392, lon: -104.9903, timeZone: 'America/Denver' },
    fetchedAt: at(0), gridUpdatedAt: at(-1), hourlyUpdatedAt: at(-1), narrativeUpdatedAt: at(-1),
    windowStart: at(0), windowEnd: at(72), sourceUrl: 'https://forecast.weather.gov/MapClick.php?lat=39.7392&lon=-104.9903',
    message: 'Some forecast components only partially cover the requested window.',
    snow: { status: 'partial', blocks: [
      { startTime: at(-3), endTime: at(3), inches: 0.5, ongoing: true },
      { startTime: at(3), endTime: at(9), inches: 1.25, ongoing: false },
    ], total: { inches: 1.25, startTime: at(3), endTime: at(9), includedPeriods: 1, complete: false }, issues: ['Only complete future source blocks contribute to this total.'] },
    ice: { status: 'partial', blocks: [{ startTime: at(3), endTime: at(9), inches: 0.1, ongoing: false }],
      total: { inches: 0.1, startTime: at(3), endTime: at(9), includedPeriods: 1, complete: false }, issues: ['Partial source coverage.'] },
    hourly: [period], narrative: [{ ...period, name: 'Tonight', detailedForecast: 'Snow and freezing rain. New snow accumulation of 1 to 3 inches possible.' }],
  }
}

/**
 * Pins remaining public GET routes behind withApiRoute.
 * Tile/image proxies must use the isolated `tiles` bucket.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..')

const WRAPPED = [
  'app/api/aviation/alerts/route.ts',
  'app/api/aviation/airport-misery/route.ts',
  'app/api/aviation/turbulence/route.ts',
  'app/api/weather/alerts/route.ts',
  'app/api/weather/spc-outlook/route.ts',
  'app/api/weather/storm-reports/route.ts',
  'app/api/weather/wis/route.ts',
  'app/api/travel/corridors/route.ts',
  'app/api/travel/trip-score/route.ts',
  'app/api/radar/manifest/route.ts',
  'app/api/radar/metadata/route.ts',
  'app/api/radar/tile/[...path]/route.ts',
  'app/api/earth-sciences/earthquakes/route.ts',
  'app/api/gfs-image/route.ts',
  'app/api/push/vapid-public/route.ts',
  'app/api/stargazer/tle/route.ts',
  'app/api/storm-reports/route.ts',
] as const

const TILES_BUCKET = [
  'app/api/radar/tile/[...path]/route.ts',
  'app/api/gfs-image/route.ts',
  'app/api/weather/iowa-nexrad/route.ts',
  'app/api/weather/noaa-wms/route.ts',
  'app/api/weather/iowa-nexrad-tiles/[timestamp]/[z]/[x]/[y]/route.ts',
] as const

describe('public GET routes use withApiRoute', () => {
  it.each(WRAPPED)('%s is wrapped', (rel) => {
    const src = readFileSync(join(ROOT, rel), 'utf8')
    expect(src).toContain("from '@/lib/api/with-api-route'")
    expect(src).toMatch(/return withApiRoute\(\s*request\s*,/)
  })

  it.each(TILES_BUCKET)('%s uses the tiles bucket', (rel) => {
    const src = readFileSync(join(ROOT, rel), 'utf8')
    expect(src).toContain("rateLimitBucket: 'tiles'")
  })
})

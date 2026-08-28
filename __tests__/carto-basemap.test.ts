import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

import {
  withCartoApiKey,
  CARTO_VOYAGER_XYZ_URL,
  CARTO_DARK_XYZ_URL,
  cartoVoyagerTileUrls,
} from '@/lib/maps/carto-basemap'

const ROOT = join(__dirname, '..')
const ALLOWED_CARTOCDN = new Set([
  'lib/maps/carto-basemap.ts',
  'middleware.ts',
  'app/layout.tsx',
  '__tests__/carto-basemap.test.ts',
  '__tests__/security-audit-fixes.test.ts',
])

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '_archive') continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}

describe('withCartoApiKey', () => {
  const base = 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'

  it('leaves the URL unchanged when the key is missing', () => {
    expect(withCartoApiKey(base, undefined)).toBe(base)
    expect(withCartoApiKey(base, '')).toBe(base)
    expect(withCartoApiKey(base, '   ')).toBe(base)
  })

  it('appends key as a query parameter', () => {
    expect(withCartoApiKey(base, 'abc123')).toBe(`${base}?key=abc123`)
  })

  it('encodes reserved characters in the key', () => {
    expect(withCartoApiKey(base, 'a&b=c')).toBe(`${base}?key=a%26b%3Dc`)
  })

  it('uses & when the URL already has a query string', () => {
    expect(withCartoApiKey(`${base}?scale=2`, 'k')).toBe(`${base}?scale=2&key=k`)
  })
})

describe('Carto XYZ templates', () => {
  it('voyager and dark URLs stay on cartocdn raster paths', () => {
    expect(CARTO_VOYAGER_XYZ_URL).toContain(
      'basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    )
    expect(CARTO_DARK_XYZ_URL).toContain('basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png')
  })

  it('voyager MapLibre tiles cover a-d subdomains', () => {
    const urls = cartoVoyagerTileUrls()
    expect(urls).toHaveLength(4)
    expect(urls.map((url) => new URL(url.replace('{z}/{x}/{y}', '0/0/0')).hostname)).toEqual([
      'a.basemaps.cartocdn.com',
      'b.basemaps.cartocdn.com',
      'c.basemaps.cartocdn.com',
      'd.basemaps.cartocdn.com',
    ])
  })
})

describe('Carto tile URLs go through the keyed helper', () => {
  it('does not hardcode cartocdn tile templates outside the helper', () => {
    const files = walk(ROOT)
    const offenders: string[] = []
    const tileTemplate = /basemaps\.cartocdn\.com\/[^\s'"]+\/\{z\}\/\{x\}\/\{y\}/

    for (const file of files) {
      const rel = relative(ROOT, file).replace(/\\/g, '/')
      if (ALLOWED_CARTOCDN.has(rel)) continue
      if (rel.startsWith('tests/')) continue
      const src = readFileSync(file, 'utf8')
      if (tileTemplate.test(src)) offenders.push(rel)
    }

    expect(offenders).toEqual([])
  })
})

/**
 * Pins lib/cities.ts as the only app/test import path for city catalogs.
 * The three source modules may import each other; nothing else may.
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = join(__dirname, '..')
const ALLOWED = new Set([
  'lib/cities.ts',
  'lib/city-metadata.ts',
  'lib/city-data.ts',
  'lib/city-database.ts',
  '__tests__/city-catalog-import-path.test.ts',
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

describe('city catalog import path', () => {
  it('does not import city-metadata, city-data, or city-database outside the facade', () => {
    const files = walk(ROOT)
    const offenders: string[] = []
    const banned = /from ['"]@\/lib\/city-(metadata|data|database)['"]/

    for (const file of files) {
      const rel = relative(ROOT, file).replace(/\\/g, '/')
      if (ALLOWED.has(rel)) continue
      const src = readFileSync(file, 'utf8')
      if (banned.test(src)) offenders.push(rel)
    }

    expect(offenders).toEqual([])
  })
})

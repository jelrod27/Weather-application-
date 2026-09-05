import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { THEME_LIST } from '@/lib/theme-config'

const MIGRATIONS = join(__dirname, '..', 'supabase', 'migrations')

/** Newest migration (by filename) that defines the theme CHECK constraint. */
function newestThemeCheckSql(): { file: string; sql: string } {
  const files = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith('.sql'))
    .sort()
  for (let i = files.length - 1; i >= 0; i -= 1) {
    const sql = readFileSync(join(MIGRATIONS, files[i]), 'utf8')
    if (sql.includes('user_preferences_theme_check')) return { file: files[i], sql }
  }
  throw new Error('no migration defines user_preferences_theme_check')
}

/** Extracts the quoted theme names from `theme IN ('a','b')` or `ANY (ARRAY['a','b'])`. */
function allowedThemes(sql: string): string[] {
  const inList = sql.match(/theme\s+IN\s*\(([^)]+)\)/i)?.[1]
  const anyList = sql.match(/ARRAY\[([^\]]+)\]/i)?.[1]
  const list = inList ?? anyList
  if (!list) throw new Error('theme CHECK list not found')
  return [...list.matchAll(/'([^']+)'/g)].map((m) => m[1])
}

describe('user_preferences theme CHECK', () => {
  it('allows exactly the themes the app can save', () => {
    const { sql } = newestThemeCheckSql()
    expect([...allowedThemes(sql)].sort()).toEqual([...THEME_LIST].sort())
  })
})

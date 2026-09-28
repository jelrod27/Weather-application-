import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('Clear Sky migration preserves saved choices, accepts all themes and defaults only new rows', async () => {
  const db = new PGlite()
  try {
    await db.exec("CREATE TABLE public.user_preferences (id int primary key, theme text DEFAULT 'nord', CONSTRAINT user_preferences_theme_check CHECK (theme IN ('nord','daybreak','synthwave84','dracula','cyberpunk','matrix'))); INSERT INTO public.user_preferences VALUES (1,'daybreak'),(2,'nord');")
    await db.exec(await readFile(new URL('../../supabase/migrations/20260928180049_user_preferences_clear_sky.sql', import.meta.url), 'utf8'))
    await db.exec('INSERT INTO public.user_preferences(id) VALUES (3)')
    assert.deepEqual((await db.query('SELECT theme FROM public.user_preferences ORDER BY id')).rows.map(r => r.theme), ['daybreak','nord','clear-sky'])
    for (const theme of ['clear-sky','nord','daybreak','synthwave84','dracula','cyberpunk','matrix']) {
      await db.query('UPDATE public.user_preferences SET theme=$1 WHERE id=3', [theme])
      assert.equal((await db.query('SELECT theme FROM public.user_preferences WHERE id=3')).rows[0].theme, theme)
    }
    await assert.rejects(db.query("UPDATE public.user_preferences SET theme='invalid' WHERE id=3"), /check constraint/)
  } finally { await db.close() }
})

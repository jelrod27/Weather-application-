import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { before, after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20260925182601_security_sweep_delivery_guards.sql'), 'utf8')
const recipient = 'a'.repeat(64)
let db

before(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    CREATE TABLE public.profiles (
      id text PRIMARY KEY, email text, username text, full_name text, avatar_url text,
      default_location text, preferred_units text, timezone text,
      welcome_email_sent_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_profile ON public.profiles TO authenticated
      USING (id = current_setting('app.user_id', true)) WITH CHECK (id = current_setting('app.user_id', true));
    GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
    GRANT ALL ON public.profiles TO service_role;
    INSERT INTO public.profiles (id,email) VALUES ('owner','owner@example.com'),('other','other@example.com');
    ${migration}
  `)
})

after(async () => { await db?.close() })
beforeEach(async () => {
  await db.exec('RESET ROLE')
  const { rows } = await db.query("SELECT to_regclass('public.guest_alert_email_limits') AS name")
  if (rows[0].name) await db.exec('TRUNCATE public.guest_alert_email_limits')
})

async function claim(key = recipient) {
  const result = await db.query('SELECT public.claim_guest_alert_email_slot($1) AS allowed', [key])
  return result.rows[0].allowed
}

describe('database security boundary', () => {
  it('allows normal own-profile edits but denies email, delivery-marker and insert writes', async () => {
    await db.exec("SET ROLE authenticated; SET app.user_id = 'owner'")
    await db.exec("UPDATE public.profiles SET username='new name', timezone='UTC' WHERE id='owner'")
    await assert.rejects(db.exec("UPDATE public.profiles SET email='victim@example.com' WHERE id='owner'"), /permission denied/)
    await assert.rejects(db.exec("UPDATE public.profiles SET welcome_email_sent_at=NULL WHERE id='owner'"), /permission denied/)
    await assert.rejects(db.exec("INSERT INTO public.profiles (id,email) VALUES ('fake','victim@example.com')"), /permission denied/)
    await db.exec("UPDATE public.profiles SET username='hijacked' WHERE id='other'")
    await db.exec('RESET ROLE')
    const result = await db.query("SELECT username FROM public.profiles WHERE id='other'")
    assert.equal(result.rows[0].username, null)
  })

  it('retains server access to profile delivery fields', async () => {
    await db.exec('SET ROLE service_role')
    await db.exec("UPDATE public.profiles SET welcome_email_sent_at=now() WHERE id='owner'")
  })

  for (const role of ['anon', 'authenticated']) it(`denies ${role} quota access and execution`, async () => {
    await db.exec(`SET ROLE ${role}`)
    await assert.rejects(claim(), /permission denied/)
    await assert.rejects(db.exec('SELECT * FROM public.guest_alert_email_limits'), /permission denied/)
  })

  it('admits one competing claim, then enforces a five-minute cooldown', async () => {
    await db.exec('SET ROLE service_role')
    assert.equal((await Promise.all(Array.from({ length: 8 }, () => claim()))).filter(Boolean).length, 1)
    await db.exec("UPDATE public.guest_alert_email_limits SET last_claimed_at=now()-interval '4 minutes'")
    assert.equal(await claim(), false)
    await db.exec("UPDATE public.guest_alert_email_limits SET last_claimed_at=now()-interval '5 minutes 1 second'")
    assert.equal(await claim(), true)
  })

  it('caps sends at five per 24-hour window and resets expired windows', async () => {
    await db.exec('SET ROLE service_role')
    await claim()
    await db.exec("UPDATE public.guest_alert_email_limits SET claim_times=ARRAY[now()-interval '30 minutes',now()-interval '24 minutes',now()-interval '18 minutes',now()-interval '12 minutes',now()-interval '6 minutes'], last_claimed_at=now()-interval '6 minutes'")
    assert.equal(await claim(), false)
    await db.exec("UPDATE public.guest_alert_email_limits SET claim_times=ARRAY[now()-interval '24 hours 1 second']")
    assert.equal(await claim(), true)
    const result = await db.query('SELECT cardinality(claim_times) AS claim_count FROM public.guest_alert_email_limits')
    assert.equal(result.rows[0].claim_count, 1)
  })

  it('keeps recipients independent and rejects malformed quota keys', async () => {
    await db.exec('SET ROLE service_role')
    assert.equal(await claim('b'.repeat(64)), true)
    await assert.rejects(claim('not-a-hash'), /Invalid recipient hash/)
  })

  it('does not reopen a full quota when only its oldest claim expires', async () => {
    await db.exec('SET ROLE service_role')
    await claim()
    // One claim just over 24h ago, followed by four recent claims. Only one
    // slot should be released, not a fresh allowance of five messages.
    await db.exec("UPDATE public.guest_alert_email_limits SET claim_times=ARRAY[now()-interval '24 hours 1 second',now()-interval '21 minutes',now()-interval '16 minutes',now()-interval '11 minutes',now()-interval '6 minutes'], last_claimed_at=now()-interval '6 minutes'")
    assert.equal(await claim(), true)
    await db.exec("UPDATE public.guest_alert_email_limits SET last_claimed_at=now()-interval '6 minutes'")
    assert.equal(await claim(), false)
  })
})

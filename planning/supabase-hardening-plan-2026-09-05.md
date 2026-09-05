# Supabase Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the eight findings of the 2026-09-05 Supabase audit of project `cckcvyccjntadoohjntr` (16bitweather.co): one live bug, one storage time bomb, one unsafe integration, no backups, a two-per-hour auth email cap, pending Postgres patches, legacy API keys, and a weak password policy.

**Architecture:** One code PR (Phase A) carries every repo change: two migration files applied through the Supabase MCP by the controller, a retention step inside the existing every-minute ingest run, a grace window for the guest-link HMAC secret so keys can rotate without breaking unsubscribe links sent in old emails, a key-type-aware REST header helper, a weekly encrypted backup workflow, and doc corrections. Phase B is Management API settings writes, one call each with a read-back. Phase C lists the steps only the user can do because they carry secret values or spend money.

**Tech Stack:** Next.js 16 / TypeScript, supabase-js 2.114, Jest, Supabase Management API (token in the macOS keychain under service name `Supabase CLI`), Supabase MCP (`apply_migration`, `execute_sql`), GitHub Actions, `pg_dump` 17, `age`.

**Spec:** The 2026-09-05 audit conversation. The "Findings addressed" table below is the spec-to-task map; the memory file `supabase-audit-2026-09.md` holds the evidence.

## Global Constraints

- `npm` only. Node 22 (`.nvmrc`).
- Work on branch `chore/supabase-hardening` in the main checkout `/Users/justinelrod/Projects/Weather-application` (clean and current as of 2026-09-05; no worktree needed). Never push to `main`; it is protected with seven required checks and admin enforcement.
- Migrations are applied to the live project **only** by the controller through the Supabase MCP `apply_migration` tool, after the task review, using the repo file's content verbatim. The repo file (date-only prefix, e.g. `20260905_name.sql`) is the reviewed source of record. Never run `supabase db push`. See `supabase/migrations/README.md`.
- No secret value passes through the agent: not the Resend API key, not database passwords, not the new Supabase keys. Those steps are Phase C, user-performed.
- Gates that must stay green before the PR: `npm run lint`, `npm run typecheck`, `npm run typecheck:tests`, `npm run knip`, and the focused Jest suites named in each task. A full `npm test` in the main checkout currently reports two false failures caused by other sessions' worktrees under `.worktrees/`; CI is the gate for the full suite.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. PR body: no emojis; sections What changed / Why / Tests run / Risks; final line `Generated with [Claude Code](https://claude.com/claude-code)`.
- Every Phase B step is a settings write and runs only after the user's go-ahead.
- Project constants: `REF=cckcvyccjntadoohjntr`, pooler host `aws-1-us-west-1.pooler.supabase.com` (session mode port 5432, transaction mode 6543), action pins are the SHAs already used in `.github/workflows/ci.yml`.

## Findings addressed

| # | Finding | Task |
|---|---|---|
| F1 | `user_preferences_theme_check` omits `daybreak` (Sentry 16BIT-WEATHER-WEB-6) | Task 1 (migration + parity test) |
| F2 | Bitwatch tables grow ~3.1 MB/day, no pruning, Free cap 500 MB | Task 2 (retention in ingest), Task 3 (indexes) |
| F3 | Supabase GitHub integration applies repo migrations to production on every push | B3, Task 6 (README note) |
| F4 | No backups on the Free plan | Task 7 (weekly encrypted dump), Phase C (role + secret + key) |
| F5 | Auth email on built-in SMTP, 2/hour | Phase C (Resend SMTP), B5 (raise rate limit) |
| F6 | Postgres 17.4.1.075 has security patches pending | B4 |
| F7 | Legacy anon/service_role JWTs in use; deprecated end of 2026 | Task 4 (grace window), Task 5 (headers), Phase C (values), B7 (disable legacy) |
| F8 | Leaked-password protection is Pro-only | Not fixable on Free; recorded |
| F9 | `password_min_length` 6, no character rules | B1 |
| F10 | SSL enforcement off for direct database connections | B2 |
| F11 | Performance advisors: 3 unindexed FKs, one `auth.uid()` initplan policy | Task 3 |
| F12 | Paused v0 leftover project `sb1-i5dw3kck` in the org | B6 (ask) |
| F13 | `planning/supabase-pro-upgrade-checklist.md` wrongly says custom SMTP needs Pro | Task 6 |

---

## Phase A: the code PR

### Task 0: Branch, ignore the CLI scratch folder

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Branch from current main**

```bash
git fetch origin && git checkout -b chore/supabase-hardening origin/main && git status --short
```

Expected: on `chore/supabase-hardening`; untracked entries include `.agents/`, `supabase/.temp/`, and `supabase/migrations/20260905_user_preferences_theme_daybreak.sql` (an uncommitted file another session left; Task 1 adopts it).

- [ ] **Step 2: Ignore `supabase/.temp/`**

The Supabase CLI writes scratch state there (`cli-latest`). Append to `.gitignore`, after the `# MCP configuration` block:

```
# Supabase CLI scratch state
supabase/.temp/
```

- [ ] **Step 3: Verify and commit**

```bash
git check-ignore -v supabase/.temp && git add .gitignore && git commit -m "Ignore the Supabase CLI scratch folder

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Expected: `check-ignore` prints the new rule.

### Task 1: Allow `daybreak` in the theme CHECK, with a parity test

**Files:**
- Test: `__tests__/theme-constraint-parity.test.ts` (create)
- Add: `supabase/migrations/20260905_user_preferences_theme_daybreak.sql` (already on disk, untracked)

**Interfaces:**
- Consumes: `THEME_LIST` from `@/lib/theme-config` (six names: nord, daybreak, synthwave84, dracula, cyberpunk, matrix).
- Produces: a migration the controller applies in Task 8, Step 3.

- [ ] **Step 1: Write the failing parity test**

The test finds the newest migration file that defines `user_preferences_theme_check` and asserts its allowed list equals `THEME_LIST`. Before the new file is added, the newest definition is the 2026-05-09 one, which lacks `daybreak`, so the test fails.

```ts
// __tests__/theme-constraint-parity.test.ts
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
```

- [ ] **Step 2: Run it and watch it fail**

```bash
git stash push -u -m "hold-daybreak-migration" -- supabase/migrations/20260905_user_preferences_theme_daybreak.sql
npm test -- theme-constraint-parity
```

Expected: 1 failed. The received list is the five-theme set from the 2026-05-09 migration; `daybreak` is missing. (The stash removes the untracked new file for the RED run only. Confirm its SHA with `git stash list --format='%H %gs'` so the next step restores exactly this entry.)

- [ ] **Step 3: Restore the migration file and make it pass**

```bash
git stash list --format='%H %gs' | grep hold-daybreak-migration
git stash apply <sha-from-previous-line> && git stash drop stash@{0}
cat supabase/migrations/20260905_user_preferences_theme_daybreak.sql
npm test -- theme-constraint-parity
```

The file must read exactly:

```sql
-- daybreak is a first-class theme in THEME_LIST and the platform default,
-- but the 20260509 CHECK never listed it. Saving theme=daybreak fails with
-- user_preferences_theme_check (Sentry 16BIT-WEATHER-WEB-6).

ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_theme_check;

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_theme_check
  CHECK (theme IN ('nord','daybreak','synthwave84','dracula','cyberpunk','matrix'));
```

Expected: 1 passed. (Use `git stash drop` on the entry you applied; re-find its index by the tag first, since other sessions share the stash stack.)

- [ ] **Step 4: Commit**

```bash
git add __tests__/theme-constraint-parity.test.ts supabase/migrations/20260905_user_preferences_theme_daybreak.sql
git commit -m "Allow daybreak in the user_preferences theme CHECK; pin parity with THEME_LIST

daybreak has been the default theme since it shipped, but the 2026-05-09
constraint only listed the other five, so saving preferences on the
default theme failed with user_preferences_theme_check (Sentry
16BIT-WEATHER-WEB-6). The new test reads the newest migration that
defines the constraint and fails whenever it drifts from THEME_LIST.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 2: Prune expired Bitwatch rows inside the ingest run

**Files:**
- Modify: `lib/bitwatch/ingest.ts` (constants block, `IngestRunResult`, new `pruneExpiredRows`, call site in `runBitwatchIngest`)
- Test: `__tests__/bitwatch-ingest.test.ts` (extend the Supabase mock; add two tests)

**Interfaces:**
- Produces: `export async function pruneExpiredRows(supabase, nowMs?): Promise<{ messages: number; events: number }>`; `IngestRunResult.pruned?: { messages: number; events: number }`; constants `SOURCE_MESSAGE_RETENTION_DAYS = 30`, `ENDED_EVENT_RETENTION_DAYS = 60`.
- Consumes: the two deletes rely on indexes added in Task 3 (`bitwatch_source_messages(observed_at)`, `bitwatch_warning_events(status, updated_at)`); the code is correct without them, only slower.

Retention rules: source messages older than 30 days by `observed_at`; warning events with `status = 'ended'` and `updated_at` older than 60 days. Active events are never touched. Nothing references these tables by foreign key (verified in `pg_constraint` on 2026-09-05), so deletes cannot cascade or fail on references. A prune failure is logged and must not fail the ingest run.

- [ ] **Step 1: Extend the test's Supabase mock to record deletes**

In `__tests__/bitwatch-ingest.test.ts`, inside `createSupabase(...)`:

1. Add `type DeleteCall = { table: string; filters: Array<[string, string, string]> }` next to `UpsertCall`.
2. Add a third parameter to `options`: `failPrune?: boolean`.
3. Add `const deletes: DeleteCall[] = []` beside `upserts`.
4. Inside `from(table)`, add `let filters: Array<[string, string, string]> = []` beside the other `let`s, extend the `op` union to `'select' | 'update' | 'delete' | null`, and in `resolveQuery` add, before the final `return`:

```ts
      if (op === 'delete') {
        deletes.push({ table, filters })
        if (options?.failPrune) {
          return { data: null, error: { message: 'prune failed' }, count: null }
        }
        return { data: null, error: null, count: table === 'bitwatch_source_messages' ? 3 : 2 }
      }
```

5. In `Object.assign(builder, {...})` add:

```ts
      delete: () => {
        op = 'delete'
        return builder
      },
      lt: (column: string, value: string) => {
        filters.push([column, 'lt', value])
        return builder
      },
```

   and change `eq: self,` to

```ts
      eq: (column: string, value: string) => {
        filters.push([column, 'eq', value])
        return builder
      },
```

6. Return `deletes` alongside `upserts` in the object `createSupabase` returns.

Read the rest of the mock (how `then`/`maybeSingle` resolve through `resolveQuery`) before editing; the delete branch must resolve through the same path the update branch does.

- [ ] **Step 2: Write the failing tests**

Append to the `describe` block that exercises `runBitwatchIngest`:

```ts
  it('prunes expired source messages and ended events after a run', async () => {
    const nowMs = Date.parse('2026-09-05T20:00:00.000Z')
    ;(fetchNwsAlertPages as jest.Mock).mockResolvedValue([])
    ;(fetchActiveAlertsDetail as jest.Mock).mockResolvedValue([])
    const supabase = createSupabase(null)

    const result = await runBitwatchIngest(supabase.client as never, nowMs)

    expect(result.ok).toBe(true)
    expect(result.pruned).toEqual({ messages: 3, events: 2 })
    expect(supabase.deletes).toEqual([
      {
        table: 'bitwatch_source_messages',
        filters: [['observed_at', 'lt', '2026-08-06T20:00:00.000Z']],
      },
      {
        table: 'bitwatch_warning_events',
        filters: [
          ['status', 'eq', 'ended'],
          ['updated_at', 'lt', '2026-07-07T20:00:00.000Z'],
        ],
      },
    ])
  })

  it('does not fail the run when pruning fails', async () => {
    const nowMs = Date.parse('2026-09-05T20:00:00.000Z')
    ;(fetchNwsAlertPages as jest.Mock).mockResolvedValue([])
    ;(fetchActiveAlertsDetail as jest.Mock).mockResolvedValue([])
    const supabase = createSupabase(null, [], { failPrune: true })
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await runBitwatchIngest(supabase.client as never, nowMs)

    expect(result.ok).toBe(true)
    expect(result.pruned).toEqual({ messages: 0, events: 0 })
    expect(errorSpy).toHaveBeenCalledWith('[bitwatch-ingest] prune failed', expect.anything())
    errorSpy.mockRestore()
  })
```

Adjust `supabase.client` to whatever name the existing tests use for the mocked client object returned by `createSupabase` (read one existing test to match). The cutoff strings are `nowMs - 30 days` and `nowMs - 60 days` in ISO form.

- [ ] **Step 3: Run the two tests and watch them fail**

```bash
npm test -- bitwatch-ingest -t "prun"
```

Expected: 2 failed (`result.pruned` is undefined; no deletes recorded).

- [ ] **Step 4: Implement**

In `lib/bitwatch/ingest.ts`, after `export const INGEST_SUPABASE_TIMEOUT_MS = 20_000`:

```ts
const DAY_MS = 24 * 60 * 60 * 1000
/** Source messages are an audit trail; the desk reads warning events, not these. */
export const SOURCE_MESSAGE_RETENTION_DAYS = 30
/** Ended events stay long enough for /warnings/[id] links in sent emails to resolve. */
export const ENDED_EVENT_RETENTION_DAYS = 60
```

Add `pruned?: { messages: number; events: number }` to `IngestRunResult` after `error?: string`.

Add before `export async function runBitwatchIngest`:

```ts
/**
 * Deletes rows past their retention window. The Free plan caps the database
 * at 500 MB and these two tables grew ~3 MB/day with nothing removing rows
 * (2026-09-05 audit). Both deletes are index range scans that usually match
 * nothing; the first run after deploy clears the backlog in one statement.
 */
export async function pruneExpiredRows(
  supabase: SupabaseClient<Database>,
  nowMs = Date.now(),
): Promise<{ messages: number; events: number }> {
  const messageCutoff = new Date(nowMs - SOURCE_MESSAGE_RETENTION_DAYS * DAY_MS).toISOString()
  const eventCutoff = new Date(nowMs - ENDED_EVENT_RETENTION_DAYS * DAY_MS).toISOString()

  const { count: messages, error: messageError } = await supabase
    .from('bitwatch_source_messages')
    .delete({ count: 'exact' })
    .lt('observed_at', messageCutoff)
  if (messageError) throw new Error(messageError.message)

  const { count: events, error: eventError } = await supabase
    .from('bitwatch_warning_events')
    .delete({ count: 'exact' })
    .eq('status', 'ended')
    .lt('updated_at', eventCutoff)
  if (eventError) throw new Error(eventError.message)

  return { messages: messages ?? 0, events: events ?? 0 }
}
```

In `runBitwatchIngest`, replace the success `return { ok: true, skipped: false, messages: collection.length, activeEvents: activeEvents.length, watermark }` with:

```ts
    // Retention runs last so a slow delete can never delay freshness or the
    // watermark, both persisted above.
    let pruned = { messages: 0, events: 0 }
    try {
      pruned = await pruneExpiredRows(supabase, nowMs)
    } catch (error) {
      console.error('[bitwatch-ingest] prune failed', error)
    }

    return {
      ok: true,
      skipped: false,
      messages: collection.length,
      activeEvents: activeEvents.length,
      watermark,
      pruned,
    }
```

- [ ] **Step 5: Run the suite for this module**

```bash
npm test -- bitwatch-ingest
npm run typecheck && npm run typecheck:tests
```

Expected: all tests in the file pass (the two new ones plus the existing set); both type checks clean.

- [ ] **Step 6: Commit**

```bash
git add lib/bitwatch/ingest.ts __tests__/bitwatch-ingest.test.ts
git commit -m "Prune Bitwatch source messages after 30 days and ended events after 60

The two tables grew about 3 MB a day with nothing deleting rows, which
would reach the Free plan's 500 MB ceiling in roughly four months. The
prune runs at the end of every ingest tick, after freshness and the
watermark are persisted, and a failure is logged rather than failing the
run. Nothing references either table by foreign key.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 3: Advisor indexes and the initplan policy fix (migration file)

**Files:**
- Create: `supabase/migrations/20260905_advisor_indexes_and_storm_reports_policy.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Performance advisors, 2026-09-05: three unindexed foreign keys, plus the
-- two range scans the new Bitwatch retention step (lib/bitwatch/ingest.ts)
-- runs every minute.
CREATE INDEX IF NOT EXISTS alert_subscriptions_saved_location_id
  ON public.alert_subscriptions (saved_location_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_guest_subscriber_id
  ON public.push_subscriptions (guest_subscriber_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id
  ON public.push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS bitwatch_source_messages_observed_at
  ON public.bitwatch_source_messages (observed_at);
CREATE INDEX IF NOT EXISTS bitwatch_warning_events_status_updated_at
  ON public.bitwatch_warning_events (status, updated_at);

-- auth_rls_initplan: evaluate auth.uid() once per statement, not per row.
-- Same predicate as before; only the call form changes.
DROP POLICY IF EXISTS "Authenticated insert pending storm reports" ON public.storm_reports;
CREATE POLICY "Authenticated insert pending storm reports"
  ON public.storm_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT auth.uid()) = user_id) AND (status = 'pending'::text));
```

- [ ] **Step 2: Sanity-check the policy text against the live definition**

The live policy (read 2026-09-05) is `cmd=INSERT`, `roles={authenticated}`, `check=((auth.uid() = user_id) AND (status = 'pending'::text))`. The migration keeps role, command, and predicate identical.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260905_advisor_indexes_and_storm_reports_policy.sql
git commit -m "Index the three unindexed foreign keys and the retention scans; fix the storm_reports initplan policy

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 4: Grace window for the guest manage-link secret

**Files:**
- Modify: `lib/alerts/guest-tokens.ts`
- Modify: `lib/env-validation.ts` (one optional entry)
- Modify: `.env.example` (two commented lines)
- Test: `__tests__/guest-tokens.test.ts`

**Interfaces:**
- Produces: `export function guestManageSecrets(): string[]` (signing secret first, then every secret still accepted for verification); `parseSignedGuestManageToken(token, secret?)` now verifies against all of them when `secret` is omitted. `signGuestManageToken` and `guestManagePath` are unchanged in signature.
- Consumes: env `BITWATCH_MANAGE_SECRET`, new env `BITWATCH_MANAGE_SECRET_PREVIOUS`, fallbacks `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

Why: manage and unsubscribe links in already-sent emails are HMAC-signed with whatever secret was first in the chain at send time, which today is the Supabase service-role key. Rotating that key (Phase C) or introducing a dedicated secret would silently invalidate every link already delivered. With this change, new links sign with the first secret and old links keep verifying against the rest.

- [ ] **Step 1: Write the failing tests**

Append to the `describe('guest-tokens')` block:

```ts
  describe('secret rotation', () => {
    const saved = { ...process.env }
    afterEach(() => {
      process.env = { ...saved }
    })

    it('signs with the first configured secret and verifies against every configured secret', () => {
      const id = '11111111-2222-4333-8444-555555555555'
      process.env.BITWATCH_MANAGE_SECRET = 'new-secret'
      process.env.BITWATCH_MANAGE_SECRET_PREVIOUS = 'old-secret'
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      delete process.env.CRON_SECRET

      const oldToken = signGuestManageToken(id, 'old-secret')
      const newToken = signGuestManageToken(id)

      expect(newToken).toBe(signGuestManageToken(id, 'new-secret'))
      expect(parseSignedGuestManageToken(newToken!)).toBe(id)
      expect(parseSignedGuestManageToken(oldToken!)).toBe(id)
      expect(parseSignedGuestManageToken(signGuestManageToken(id, 'unknown')!)).toBeNull()
    })

    it('falls back to the service role key when no dedicated secret is set', () => {
      const id = '11111111-2222-4333-8444-555555555555'
      delete process.env.BITWATCH_MANAGE_SECRET
      delete process.env.BITWATCH_MANAGE_SECRET_PREVIOUS
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
      delete process.env.CRON_SECRET

      const token = signGuestManageToken(id)
      expect(token).toBe(signGuestManageToken(id, 'service-role'))
      expect(parseSignedGuestManageToken(token!)).toBe(id)
    })

    it('verifies with only the explicit secret when one is passed', () => {
      const id = '11111111-2222-4333-8444-555555555555'
      process.env.BITWATCH_MANAGE_SECRET = 'new-secret'
      const token = signGuestManageToken(id, 'new-secret')
      expect(parseSignedGuestManageToken(token!, 'other')).toBeNull()
    })
  })
```

- [ ] **Step 2: Run and watch them fail**

```bash
npm test -- guest-tokens
```

Expected: the rotation test fails (the old-secret token returns null because only the first secret is tried).

- [ ] **Step 3: Implement**

Replace `guestManageSecret` and `parseSignedGuestManageToken` in `lib/alerts/guest-tokens.ts` with:

```ts
/**
 * Secrets for guest manage links, most preferred first. Links are signed with
 * the first entry and verified against all of them, so a secret can be
 * rotated by moving the old value to BITWATCH_MANAGE_SECRET_PREVIOUS: links
 * in already-sent emails keep working while new emails carry the new secret.
 * The service-role and cron fallbacks exist because links were signed with
 * them before a dedicated secret existed.
 */
export function guestManageSecrets(): string[] {
  const candidates = [
    process.env.BITWATCH_MANAGE_SECRET,
    process.env.BITWATCH_MANAGE_SECRET_PREVIOUS,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.CRON_SECRET,
  ]
  return candidates.filter((value): value is string => typeof value === 'string' && value.length > 0)
}

export function guestManageSecret(): string | null {
  return guestManageSecrets()[0] ?? null
}

function parseWithSecret(token: string, secret: string): string | null {
  if (!token.startsWith(MANAGE_PREFIX)) return null
  const rest = token.slice(MANAGE_PREFIX.length)
  const dot = rest.lastIndexOf('.')
  if (dot <= 0) return null
  const subscriberId = rest.slice(0, dot)
  const given = rest.slice(dot + 1)
  if (!subscriberId || !given) return null
  const expected = createHmac('sha256', secret).update(subscriberId).digest('base64url')
  const givenBuf = Buffer.from(given)
  const expectedBuf = Buffer.from(expected)
  if (givenBuf.length !== expectedBuf.length) return null
  if (!timingSafeEqual(givenBuf, expectedBuf)) return null
  return subscriberId
}

export function parseSignedGuestManageToken(token: string, secret?: string): string | null {
  const secrets = secret ? [secret] : guestManageSecrets()
  for (const candidate of secrets) {
    const subscriberId = parseWithSecret(token, candidate)
    if (subscriberId) return subscriberId
  }
  return null
}
```

`signGuestManageToken` keeps its `secret = guestManageSecret()` default and is otherwise unchanged.

- [ ] **Step 4: Document the new variable**

In `lib/env-validation.ts`, directly after the `BITWATCH_MANAGE_SECRET` entry, add:

```ts
    BITWATCH_MANAGE_SECRET_PREVIOUS: {
      name: 'BITWATCH_MANAGE_SECRET_PREVIOUS',
      description: 'Previous HMAC secret kept during rotation so manage links in already-sent emails keep verifying (optional).',
    },
```

In `.env.example`, after the `SUPABASE_WEBHOOK_SECRET` block's lines, add:

```bash
# Guest alert manage links are HMAC-signed. Set a dedicated secret; keep the
# previous value here while rotating so links in old emails still verify.
# BITWATCH_MANAGE_SECRET=your_random_secret_here
# BITWATCH_MANAGE_SECRET_PREVIOUS=
```

- [ ] **Step 5: Run the suite and the gates**

```bash
npm test -- guest-tokens guest-alert-subscribers
npm run typecheck && npm run typecheck:tests
```

Expected: all pass, type checks clean.

- [ ] **Step 6: Commit**

```bash
git add lib/alerts/guest-tokens.ts lib/env-validation.ts .env.example __tests__/guest-tokens.test.ts
git commit -m "Verify guest manage links against every configured secret so the key can rotate

Links in already-sent alert emails were signed with the Supabase service
role key, the first fallback in the chain. Rotating that key, or adding
a dedicated BITWATCH_MANAGE_SECRET, would have invalidated every
unsubscribe link in users' inboxes. New links sign with the first
configured secret; verification tries BITWATCH_MANAGE_SECRET_PREVIOUS
and the fallbacks too.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 5: Key-type-aware headers for the direct REST helper

**Files:**
- Modify: `lib/services/welcome-email-db.ts` (export and change `adminHeaders`)
- Test: `__tests__/welcome-email-db.test.ts` (create)

Why: the new Supabase secret keys (`sb_secret_...`) are not JWTs. Supabase's migration guide says to send them on the `apikey` header only; a `Authorization: Bearer sb_secret_...` header is rejected with "Invalid JWT". The legacy service-role JWT needs both headers. This helper is the only direct REST caller in the app; supabase-js handles the distinction itself.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/welcome-email-db.test.ts
import { adminHeaders } from '@/lib/services/welcome-email-db'

describe('adminHeaders', () => {
  it('sends a legacy service-role JWT on both apikey and Authorization', () => {
    const headers = adminHeaders('eyJhbGciOiJIUzI1NiJ9.legacy.jwt') as Record<string, string>
    expect(headers.apikey).toBe('eyJhbGciOiJIUzI1NiJ9.legacy.jwt')
    expect(headers.Authorization).toBe('Bearer eyJhbGciOiJIUzI1NiJ9.legacy.jwt')
  })

  it('sends a new-style secret key on apikey only', () => {
    const headers = adminHeaders('sb_secret_abc123') as Record<string, string>
    expect(headers.apikey).toBe('sb_secret_abc123')
    expect(headers).not.toHaveProperty('Authorization')
  })
})
```

- [ ] **Step 2: Run and watch it fail**

```bash
npm test -- welcome-email-db
```

Expected: fails to compile or fails the second case (`adminHeaders` is not exported / Authorization present).

- [ ] **Step 3: Implement**

Replace `adminHeaders` in `lib/services/welcome-email-db.ts` with:

```ts
/**
 * New-style Supabase keys (sb_secret_...) are not JWTs and must travel on the
 * apikey header only; the gateway rejects them on Authorization with
 * "Invalid JWT". Legacy service_role JWTs need both headers.
 */
export function adminHeaders(key: string): HeadersInit {
  const headers: Record<string, string> = {
    apikey: key,
    'Content-Type': 'application/json',
  }
  if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`
  return headers
}
```

- [ ] **Step 4: Run the tests and gates**

```bash
npm test -- welcome-email-db welcome-email-service
npm run typecheck && npm run typecheck:tests && npm run knip
```

Expected: pass; knip does not flag the new export (it is consumed by the test and the module).

- [ ] **Step 5: Commit**

```bash
git add lib/services/welcome-email-db.ts __tests__/welcome-email-db.test.ts
git commit -m "Send new-style Supabase secret keys on the apikey header only

sb_secret_ keys are not JWTs; the gateway rejects them on Authorization.
Legacy service_role JWTs still get both headers, so the swap to the new
key is an environment change with no further code edits.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 6: Documentation corrections

**Files:**
- Modify: `planning/supabase-pro-upgrade-checklist.md`
- Modify: `supabase/migrations/README.md`

- [ ] **Step 1: Fix the custom SMTP claim**

In `planning/supabase-pro-upgrade-checklist.md`, the table row

```
| Branded auth emails | Custom SMTP (`noreply@16bitweather.co`) — not available on Free |
```

becomes

```
| Branded auth emails | Not a Pro trigger: custom SMTP is configurable on every plan (Auth → SMTP Settings). Point it at Resend; the built-in sender is capped at 2 emails/hour and documented as not for production. |
```

and in the "Stay on Free while all of these are true" list, replace `- Supabase-branded auth emails are acceptable` with `- Custom SMTP is configured (Resend), so auth email is not rate-capped`.

Add under "## Upgrade to Pro ($25/mo) when any trigger fires", a new first row:

```
| Backups | Free has none. Until Pro, `.github/workflows/db-backup.yml` takes a weekly encrypted logical dump (see that file's header for restore steps). |
```

- [ ] **Step 2: Note the integration hazard in the migrations README**

Append to `supabase/migrations/README.md`:

```
## Supabase GitHub integration

Do not connect the Supabase GitHub integration (or "branching") to this
repository. It clones the repo on every push to `main` and tries to apply
the files here to the production database. Because these files are
records with date-only prefixes, it fails today; a correctly named file
would be applied on merge, outside the MCP workflow above. It was
disconnected on 2026-09-05 after the audit found it running eleven
times a day.
```

- [ ] **Step 3: Commit**

```bash
git add planning/supabase-pro-upgrade-checklist.md supabase/migrations/README.md
git commit -m "planning: custom SMTP is not a Pro feature; note the GitHub integration hazard

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 7: Weekly encrypted database backup workflow

**Files:**
- Create: `.github/workflows/db-backup.yml`
- Create: `.github/backup-recipient.txt` (placeholder line; the user replaces it with their `age` public key in Phase C)

Design: `pg_dump` 17 over the Supabase session pooler (IPv4; the direct host is IPv6-only on Free), as a dedicated read-only role, producing a custom-format data dump of `public` and `auth` plus a plain schema dump of `public`. Both files are encrypted with `age` to a public key committed in the repo, then uploaded as a workflow artifact with 90-day retention, the maximum for a public repository. Decryption needs the private key, which only the user holds. The workflow fails cleanly until the secret and the recipient key exist.

- [ ] **Step 1: Write the workflow**

```yaml
name: Database backup

# Weekly logical dump of the production Supabase database. The Free plan has
# no backups. Output is encrypted with age to the public key in
# .github/backup-recipient.txt and kept as an artifact for 90 days.
#
# Restore (on a machine holding the age private key):
#   age -d -i backup-key.txt backup-YYYYMMDD.data.dump.age > data.dump
#   age -d -i backup-key.txt backup-YYYYMMDD.public-schema.sql.age > schema.sql
#   psql "$NEW_DB_URL" -f schema.sql
#   pg_restore --data-only --no-owner --disable-triggers -d "$NEW_DB_URL" data.dump
#
# Requires the repository secret SUPABASE_BACKUP_DB_URL: a session-pooler
# connection string for the read-only backup_reader role (see
# planning/supabase-hardening-plan-2026-09-05.md, Phase C).

on:
  schedule:
    - cron: '30 9 * * 1' # Mondays 09:30 UTC
  workflow_dispatch:

permissions:
  contents: read

jobs:
  dump:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false

      - name: Refuse to run without a recipient key
        run: |
          set -euo pipefail
          grep -Eq '^age1[0-9a-z]{58}$' .github/backup-recipient.txt || {
            echo "::error::.github/backup-recipient.txt does not hold an age public key"
            exit 1
          }

      - name: Install age and pg_dump 17
        run: |
          set -euo pipefail
          sudo apt-get update -qq
          sudo apt-get install -y -qq age postgresql-common
          sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
          sudo apt-get install -y -qq postgresql-client-17
          pg_dump --version && age --version

      - name: Dump and encrypt
        env:
          DB_URL: ${{ secrets.SUPABASE_BACKUP_DB_URL }}
          PGSSLMODE: require
        run: |
          set -euo pipefail
          test -n "$DB_URL" || { echo "::error::SUPABASE_BACKUP_DB_URL is not set"; exit 1; }
          stamp=$(date -u +%Y%m%d)
          recipient=$(cat .github/backup-recipient.txt)
          pg_dump "$DB_URL" --data-only --format=custom --no-owner --no-privileges \
            --schema=public --schema=auth --file="backup-$stamp.data.dump"
          pg_dump "$DB_URL" --schema-only --format=plain --no-owner --no-privileges \
            --schema=public --file="backup-$stamp.public-schema.sql"
          age -r "$recipient" -o "backup-$stamp.data.dump.age" "backup-$stamp.data.dump"
          age -r "$recipient" -o "backup-$stamp.public-schema.sql.age" "backup-$stamp.public-schema.sql"
          shred -u "backup-$stamp.data.dump" "backup-$stamp.public-schema.sql"
          ls -l backup-*.age

      - name: Upload encrypted backup
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: db-backup-${{ github.run_id }}
          path: backup-*.age
          retention-days: 90
          if-no-files-found: error
```

- [ ] **Step 2: Create the recipient placeholder**

`.github/backup-recipient.txt` containing exactly one line:

```
REPLACE-WITH-AGE-PUBLIC-KEY
```

The guard step fails until it is replaced, so the workflow cannot upload an unencrypted or wrongly encrypted dump.

- [ ] **Step 3: Verify**

```bash
node scripts/check-workflows.mjs
grep -c 'timeout-minutes' .github/workflows/db-backup.yml
```

Expected: the checker lists `db-backup.yml` as `ok` with `permissions={"contents":"read"}` and `unpinned=none`; grep prints 1.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/db-backup.yml .github/backup-recipient.txt
git commit -m "Add a weekly encrypted logical backup of the production database

The Supabase Free plan keeps no backups. pg_dump runs over the session
pooler as a read-only role, the output is encrypted with age to a public
key committed in the repo, and the artifact is retained for 90 days.
The job refuses to run until the recipient key and the connection secret
exist, so it can never upload plaintext.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 8: Open the PR, apply the migrations, hand off the merge

- [ ] **Step 1: Gates**

```bash
npm run lint && npm run typecheck && npm run typecheck:tests && npm run knip
npx jest --ci --runInBand --testPathIgnorePatterns '/\.worktrees/' __tests__/theme-constraint-parity.test.ts __tests__/bitwatch-ingest.test.ts __tests__/guest-tokens.test.ts __tests__/welcome-email-db.test.ts __tests__/guest-alert-subscribers.test.ts
node scripts/check-workflows.mjs
```

Expected: lint 0 errors; type checks and knip clean; every listed suite passes; checker lists ten workflows `ok`.

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin chore/supabase-hardening
gh pr create --base main --title "Supabase hardening: theme fix, Bitwatch retention, secret rotation, encrypted backups" --body-file <body>
```

Body sections: What changed (one bullet per task), Why (audit findings F1, F2, F4, F7, F11, F13), Tests run, Risks (the retention step's first production run deletes the backlog older than the windows; the backup job stays red until Phase C secrets exist; the two migration files are applied by the controller through the Supabase MCP, not by CI).

- [ ] **Step 3: Controller applies the two migrations after the task review is clean**

Through the Supabase MCP, in this order, each with the repo file's SQL verbatim:

1. `apply_migration(name: "user_preferences_theme_daybreak")`
2. `apply_migration(name: "advisor_indexes_and_storm_reports_policy")`

Read back with `execute_sql`:

```sql
select pg_get_constraintdef(oid) from pg_constraint where conname = 'user_preferences_theme_check';
select indexname from pg_indexes where schemaname='public' and indexname in ('alert_subscriptions_saved_location_id','push_subscriptions_guest_subscriber_id','push_subscriptions_user_id','bitwatch_source_messages_observed_at','bitwatch_warning_events_status_updated_at') order by 1;
select policyname, with_check from pg_policies where tablename='storm_reports' and cmd='INSERT';
```

Expected: the constraint lists six themes including `daybreak`; five index names; the policy's `with_check` contains `( SELECT auth.uid() AS uid)`.

Then `get_advisors(type: "performance")`: the three `unindexed_foreign_keys` and the `auth_rls_initplan` items are gone.

- [ ] **Step 4: Merge is the user's**

Report the PR link with checks green. After the merge deploys, verify on production: the first ingest tick's response includes `pruned`, and `select count(*) from public.bitwatch_source_messages where observed_at < now() - interval '30 days'` returns 0 (there are no rows that old until 2026-09-17, so 0 is expected either way; the proof is the `pruned` field).

---

## Phase B: Management API settings (one call each, after the user's go)

Token: `security find-generic-password -s "Supabase CLI" -w` inside the same command that uses it; never print it. Base URL `https://api.supabase.com/v1/projects/cckcvyccjntadoohjntr`.

### B1: Password policy (F9)

```bash
PATCH config/auth  {"password_min_length": 8, "password_required_characters": "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789"}
GET   config/auth  → password_min_length=8, password_required_characters as sent
```

If the API rejects the character-class string, the dashboard equivalent is Authentication → Providers → Email → "Letters and digits". Existing users keep signing in; they are told their password is weak only when they change it.

### B2: Enforce SSL on direct database connections (F10)

```bash
PUT ssl-enforcement  {"requestedConfig": {"database": true}}
GET ssl-enforcement  → currentConfig.database=true
```

Nothing in the app connects directly; the backup job uses `sslmode=require`.

### B3: Disconnect branching / the GitHub integration (F3)

```bash
DELETE branches     (disables preview branching for the project)
GET    branches     → []
```

Then `list_branches` via MCP should return no `main` entity, and the "Supabase Preview" check should stop appearing on PRs. If the GitHub app connection itself persists, the user removes it under Project Settings → Integrations → GitHub.

### B4: Postgres upgrade (F6), after Task 7's first successful backup or a manual dump

```bash
GET  upgrade/eligibility  → eligible=true, latest ga app_version (17.6.1.166 on 2026-09-05)
POST upgrade              {"target_version": 17, "release_channel": "ga"}
```

Expect a few minutes of downtime; run at a quiet hour with the user watching. Read back `get_project` until status is ACTIVE_HEALTHY and the version string is the target, then re-run `get_advisors(security)`: the `vulnerable_postgres_version` warning is gone.

### B5: Raise the auth email rate limit, only after Phase C configured Resend SMTP (F5)

```bash
PATCH config/auth  {"rate_limit_email_sent": 30}
GET   config/auth  → smtp_host=smtp.resend.com, rate_limit_email_sent=30
```

Never raise the limit while `smtp_host` is null; the built-in sender is capped at 2 regardless.

### B6: Delete the paused v0 leftover project (F12), ask first

`sb1-i5dw3kck` (`fcjdryxngiwabyvtyaen`), created 2025-01-27, INACTIVE, Postgres 15. `DELETE /v1/projects/fcjdryxngiwabyvtyaen` is irreversible. `Majong` stays; it belongs to the mahjong app.

### B7: Disable the legacy API keys (F7), only after Phase C swapped the values and production was verified

```bash
PUT api-keys/legacy?enabled=false
GET api-keys?reveal=false  → legacy entries absent or disabled
```

Verify first: sign in on production, load a saved location, trigger a guest-subscribe verify email, and confirm the welcome-email path (a profiles INSERT webhook) still writes `welcome_email_sent_at`.

---

## Phase C: user-performed steps (secret values or money)

1. **Backup role and secret** (F4). In the Supabase SQL editor, with a password from your password manager in place of `PASSWORD`:

   ```sql
   create role backup_reader with login password 'PASSWORD' noinherit;
   grant pg_read_all_data to backup_reader;
   ```

   Then add the GitHub repository secret `SUPABASE_BACKUP_DB_URL` with the value
   `postgresql://backup_reader.cckcvyccjntadoohjntr:PASSWORD@aws-1-us-west-1.pooler.supabase.com:5432/postgres?sslmode=require`
   (percent-encode the password if it has special characters). Generate an age key pair on your machine with `age-keygen -o backup-key.txt`, store `backup-key.txt` in your password manager, and replace the single line of `.github/backup-recipient.txt` with the `age1...` public key it printed, in a small PR. Run the workflow once by hand and confirm the artifact appears.

2. **Custom SMTP through Resend** (F5). Supabase dashboard → Authentication → SMTP Settings: host `smtp.resend.com`, port `465`, username `resend`, password = a Resend API key, sender `noreply@16bitweather.co`, sender name `16-Bit Weather`. Then tell the agent to run B5.

3. **Key rotation** (F7), after the PR merges:
   - Vercel: set `BITWATCH_MANAGE_SECRET` to a fresh random value (`openssl rand -hex 32`), and `BITWATCH_MANAGE_SECRET_PREVIOUS` to the current legacy service-role JWT (copy it from Supabase → Settings → API Keys → Legacy). Both Production and Preview, sensitive.
   - Vercel: replace the value of `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the `sb_publishable_...` key and the value of `SUPABASE_SERVICE_ROLE_KEY` with the `sb_secret_...` key (both exist already under Settings → API Keys). Same names; only values change.
   - Redeploy, run the B7 verification list, then tell the agent to run B7.

4. **Pro decision** (F4, F8). Pro ($25/month) adds daily backups, leaked-password protection, and 7-day auth logs. The weekly dump covers the backup gap for a project of this size; the other two are the remaining benefits.

---

## Phase D: verification

Re-run `get_advisors` for both types (expect only the Free-plan-limited items: leaked password protection, and the `rls_enabled_no_policy` INFO rows for service-managed tables), `execute_sql` the constraint and index read-backs, `GET config/auth` for the password policy and SMTP host, `GET ssl-enforcement`, `list_branches`, and a `db-backup` workflow run with a green artifact.

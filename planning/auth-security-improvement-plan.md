# Auth Workflow & Security Posture — Audit and Improvement Plan

**Date:** 2026-07-08
**Scope:** Full review of authentication workflow (code), Supabase project security (advisors, RLS, auth config, live user data), and Vercel production posture (runtime errors, headers).
**Verdict:** Security fundamentals are strong. The gaps are bot/abuse protection, password policy enforcement, a broken password-recovery flow, and auth UX friction. A plan is warranted — prioritized below.

---

## 1. Recommended auth method (the direct answer)

For a consumer app like 16-Bit Weather, the optimal stack in 2026 is:

1. **Google OAuth as the primary, above-the-fold method.** Your live data confirms it: 6 of 8 users (75%) signed up with Google, and all 3 users active in the last 30 days are Google users. OAuth is both the most user-friendly (one click, no password) and the most secure option you offer (no credential to phish or stuff; Google enforces its own MFA).
2. **Magic link (email OTP) as the fallback**, replacing the password form as the default email path. Passwordless removes your two biggest email-auth problems at once: weak passwords (your only guard is a client-side `minLength=6`) and confirmation-flow drop-off (1 of your 2 email users never confirmed — a 50% loss on that path). Supabase supports this natively via `signInWithOtp`; magic links and 6-digit OTP codes share one implementation.
3. **Keep password sign-in available but demoted** ("More options") for existing password users; don't force-migrate.
4. **Passkeys (WebAuthn): adopt later, not now.** Supabase passkey support exists but is **experimental** (opt-in, API may change). Right long-term destination — phishing-resistant, no shared secret — wrong quarter for a solo project. Revisit when Supabase marks it GA.

GitHub OAuth has zero sign-ups in your data. Fold it under "More options" or remove it.

---

## 2. What is already GOOD (verified — do not re-fix)

- **Middleware uses `supabase.auth.getUser()`** (server-verified), not `getSession()` — correct trust boundary (`middleware.ts:88-90`), with correct SSR cookie-refresh pattern.
- **Redirect validation is sound.** `lib/utils/redirect-validation.ts` blocks `//`, schemes, backslashes, and percent-encoding bypasses via a strict allowlist. No open redirect found, including in the OAuth callback (PKCE, sanitized error logging, 303 redirects).
- **RLS posture is solid.** `profiles`, `saved_locations`, `user_preferences`, `alert_subscriptions`, `user_alerts` all have owner-scoped policies on `auth.uid()`. The `weather_cache` `USING(true)` policy was removed; `handle_new_user()` is `SECURITY DEFINER` with pinned `search_path` and revoked from anon/authenticated.
- **No IDOR.** `api/user/preferences`, `api/user/alerts`, `api/locations` all derive the user id from a verified session, never from client input; Zod strips client-sent `user_id`.
- **Service-role key confined to server-only modules**; cron and webhook endpoints use constant-time secret comparison; Playwright bypass is disabled in production.
- **Secrets hygiene clean.** No hardcoded keys; `NEXT_PUBLIC_*` limited to safe values; gitleaks hooks in place.
- **Headers:** HSTS with preload, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy; per-request CSP in middleware.

---

## 3. Findings (prioritized)

### HIGH-leverage, low-effort

**F1. No bot/abuse protection on auth (MED severity).** Sign-in/sign-up/reset call `supabase.auth.*` directly from the browser — there is no server route to throttle, no CAPTCHA anywhere. Your in-house rate limiter covers only weather/user APIs, is in-memory (doesn't hold across Vercel serverless instances), and fails open. Credential stuffing and signup abuse are currently held off only by Supabase's default limits.
→ Enable **CAPTCHA (Cloudflare Turnstile)** in Supabase Dashboard: Settings → Authentication → Bot and Abuse Protection. Turnstile is free and privacy-friendly. Add the widget token to `AuthForm` (`options.captchaToken`).

**F2. Leaked-password protection disabled (Supabase advisor: WARN).** HaveIBeenPwned checking is off; password min length is effectively 6, enforced client-side only (`components/auth/auth-form.tsx:228`) and trivially bypassed.
→ Dashboard: enable leaked-password protection; raise minimum length to 10+ with character requirements. Zero code.

**F3. Postgres has outstanding security patches (Supabase advisor: WARN).** Running `supabase-postgres-17.4.1.075`.
→ Dashboard: upgrade database. Zero code. ([remediation](https://supabase.com/docs/guides/platform/upgrading))

**F4. Production error noise: `AuthSessionMissingError` — 443 occurrences / 250 users (top runtime error).** `getServerUser` logs every anonymous visitor as a `console.error` (`lib/supabase/server.ts:45`), polluting Vercel logs and Sentry across 9 routes + middleware. An anonymous session is not an error.
→ Filter `AuthSessionMissingError` before logging. Also consider skipping the `getUser()` round-trip in middleware for public `/api/*` routes (perf).

**F5. Password-recovery flow appears broken (functional).** `resetPassword` redirects the recovery link back to `/auth/reset-password`, but that page only renders the "request email" form — there's no step to consume the recovery token and set a new password.
→ Add an update-password handler/page. Test end-to-end.

### MEDIUM

**F6. `next` redirect param is dropped by the form.** Middleware sets `?next=` and the OAuth callback honors it, but `AuthForm` hardcodes `/dashboard?welcome=1` for email sign-in, never passes `redirectTo` to `signInWithProvider`, and `ProtectedRoute` redirects to bare `/auth/login`. Users never return to where they were.

**F7. Two competing `useAuth` implementations.** `lib/auth/auth-context.tsx` (full) vs `lib/supabase/hooks.ts` (session-only, used by `useSavedLocations`). Risk of divergent auth state; consolidate on the context before building modal UX on top.

**F8. Logout CSRF (LOW).** `/auth/signout` is a cookie-authenticated POST with no origin check. Impact limited to forced logout. → Add an Origin/Referer check.

**F9. Header config drift (LOW).** `vercel.json` re-declares some headers but omits HSTS/CSP — two sources of truth. → Remove header duplication from `vercel.json`; keep `next.config.mjs` + middleware CSP canonical.

**F10. CSP allows `'unsafe-inline'` scripts (documented accepted risk).** Required for SSG hydration without nonces. Acceptable while the no-untrusted-HTML invariant holds; revisit if you ever render user-generated HTML.

### INFO (intentional, leave alone)

- `aeroapi_usage` and `alert_monitor_state` have RLS enabled with no policies — deny-all by design (service-role/cron writes only). Advisor flags are expected. ([lint reference](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy))

---

## 4. Improvement plan

### Phase 0 — Dashboard-only, do today (no code, ~15 min)
1. Enable leaked-password protection (F2).
2. Set password min length ≥ 10 (F2).
3. Enable Turnstile CAPTCHA in Supabase (F1) — code hookup lands in Phase 1.
4. Schedule the Postgres upgrade (F3).

### Phase 1 — Security & correctness fixes (one PR, ~half day)
1. Wire Turnstile token into `AuthForm` (`captchaToken` on signUp/signIn/reset) (F1).
2. Stop logging `AuthSessionMissingError` as an error; skip middleware `getUser()` for public API routes (F4).
3. Fix the password-recovery completion flow (F5).
4. Thread `next` end-to-end: login page → `AuthForm` → email sign-in redirect + `signInWithProvider({ redirectTo })`; make `ProtectedRoute` preserve the attempted path (F6).
5. Origin check on `/auth/signout` (F8). De-duplicate headers in `vercel.json` (F9).

### Phase 2 — Auth UX overhaul (shipped on `auth/security-and-ux-overhaul`)
1. **Reorder the form:** Google button alone above the fold; "Continue with email" (magic link via `signInWithOtp`) below; password + GitHub under "More options."
2. **Unify `/auth`** — login/signup redirect to one route.
3. **Consolidate `useAuth`** on `lib/auth/auth-context.tsx`; retire the `lib/supabase/hooks.ts` variant (F7).
4. **Slim password signup** — email + password only; username/full name stay on `/profile`.

### Phase 3 — Conversion features (shipped on `auth/security-and-ux-overhaul`)
1. "Save to dashboard" on public weather pages.
2. Auth-gate modal using consolidated `useAuth` + `next` plumbing.
3. Dashboard preview for logged-out users (middleware + `<ProtectedRoute>` relaxed).

### Phase 4 — Later / watchlist
- Passkeys when Supabase support goes GA.
- Move the in-house rate limiter to a shared store (Upstash Redis / Vercel KV) — matters more as traffic grows.
- Optional MFA (TOTP) for accounts — low priority for a weather app.

---

## 5. Success metrics (solo-friendly)

- % OAuth vs magic link vs password (query `auth.users.raw_app_meta_data->>'provider'` — baseline today: google 6, email 2).
- Email-path completion rate (baseline: 50% — 1 of 2 email users unconfirmed).
- `AuthSessionMissingError` count in Vercel runtime errors → should drop to ~0 after Phase 1 (baseline: 443).
- Supabase security advisors → 2 WARNs today, target 0 (INFO lints excepted).
- After Phase 3: logged-out save attempts → completed sign-ins.

## 6. References

- [Supabase: Enable CAPTCHA protection](https://supabase.com/docs/guides/auth/auth-captcha)
- [Supabase: Passwordless email logins (magic link / OTP)](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase: `signInWithOtp`](https://supabase.com/docs/reference/javascript/auth-signinwithotp)
- [Supabase: Passkey authentication (experimental)](https://supabase.com/docs/guides/auth/passkeys)
- [Supabase: Password strength & leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [Supabase: Upgrading Postgres](https://supabase.com/docs/guides/platform/upgrading)

/**
 * Security tests for audit fixes (critical + high + medium + low severity)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Fix 1: XSS — blog article rendering', () => {
  const src = readFileSync(join(__dirname, '..', 'app', 'blog', '[slug]', 'blog-article.tsx'), 'utf-8');
  it('should not contain dangerouslySetInnerHTML', () => {
    expect(src).not.toContain('dangerouslySetInnerHTML');
  });
});

// Fixes 2, 3, 4 covered the games surface (postMessage origin validation,
// Supabase filter injection on /api/games, admin auth on POST /api/games).
// All three were removed alongside the games feature itself.

describe('Fix 5: CSP unsafe-eval removed', () => {
  const src = readFileSync(join(__dirname, '..', 'next.config.mjs'), 'utf-8');
  it('should not contain unsafe-eval in script-src', () => {
    // unsafe-eval allows arbitrary code execution via eval() — must be removed
    // unsafe-inline is kept because Next.js requires it for inline hydration scripts
    expect(src).not.toContain("'unsafe-eval'");
  });
});

// Fix 6 covered the games scores route, also removed with the games feature.

describe('Fix 7: Info disclosure on cron endpoint', () => {
  const src = readFileSync(join(__dirname, '..', 'app', 'api', 'cron', 'keep-alive', 'route.ts'), 'utf-8');
  it('should not expose raw error.message in response body', () => {
    expect(src).not.toMatch(/Response\.json\(\s*\{[^}]*error:\s*error\.message/);
  });
});

describe('Fix 8: Open proxy params on NOAA WMS', () => {
  const src = readFileSync(join(__dirname, '..', 'app', 'api', 'weather', 'noaa-wms', 'route.ts'), 'utf-8');
  it('should whitelist allowed WMS parameters instead of forwarding all', () => {
    expect(src).toContain('ALLOWED_PARAMS');
    expect(src).not.toMatch(/searchParams\.forEach\(\(value, key\)/);
  });
});

describe('Fix 9: Test auth bypass gated to non-prod', () => {
  // The lib/supabase/middleware.ts file (parallel/dead helper) was deleted
  // in Phase 4 cleanup. The active Playwright bypass now lives only in
  // lib/playwright-test-mode.ts and is gated via NODE_ENV !== 'production'.
  const src = readFileSync(join(__dirname, '..', 'lib', 'playwright-test-mode.ts'), 'utf-8');
  it('should require non-production NODE_ENV to enable the bypass', () => {
    expect(src).toMatch(/NODE_ENV !== 'production'/);
  });
  it('should check for explicit PLAYWRIGHT_TEST_MODE env', () => {
    expect(src).toContain('PLAYWRIGHT_TEST_MODE');
  });
  it('should not read the NEXT_PUBLIC_ variant (would inline into client bundle)', () => {
    expect(src).not.toContain('NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE');
  });
});

// "Fix 10: Rate limit IP source" was removed with the news-overhaul: it audited
// the NewsAPI proxy at app/api/news/route.ts, which was deleted as dead code
// (orphaned subsystem). The live keyless /api/news/rss has no rate limiter to
// protect, so there is nothing to assert here.

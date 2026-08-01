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

describe('Fix 5: CSP unsafe-eval removed from production', () => {
  // CSP is owned by middleware.ts (buildCspHeader). next.config.mjs must not
  // duplicate it — grepping next.config would be a false green.
  const src = readFileSync(join(__dirname, '..', 'middleware.ts'), 'utf-8');

  it('builds CSP in middleware', () => {
    expect(src).toContain('function buildCspHeader');
  });

  it('production script-src omits unsafe-eval', () => {
    const prodBranch = src.match(/isProd\s*\?\s*`([^`]+)`/);
    expect(prodBranch).not.toBeNull();
    expect(prodBranch![1]).not.toContain("'unsafe-eval'");
    expect(prodBranch![1]).toContain("script-src 'self' 'unsafe-inline'");
  });

  it('non-production script-src allows unsafe-eval for tooling', () => {
    const nonProdBranch = src.match(/isProd\s*\?\s*`[^`]+`\s*:\s*`([^`]+)`/);
    expect(nonProdBranch).not.toBeNull();
    expect(nonProdBranch![1]).toContain("'unsafe-eval'");
  });
});

describe('CSP connect-src allows aviation MapLibre basemap hosts', () => {
  const src = readFileSync(join(__dirname, '..', 'middleware.ts'), 'utf-8');
  it('allowlists Carto Voyager tiles (radar-matching basemap)', () => {
    expect(src).toContain('https://*.basemaps.cartocdn.com');
  });
  it('allowlists OpenFreeMap glyphs for MapLibre labels', () => {
    expect(src).toContain('https://tiles.openfreemap.org');
  });
  it('does not allowlist the removed ipgeolocation provider', () => {
    expect(src).not.toContain('api.ipgeolocation.io');
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

describe('Fix 10: RSS news route is rate-limited', () => {
  const src = readFileSync(join(__dirname, '..', 'app', 'api', 'news', 'rss', 'route.ts'), 'utf-8');
  it('runs the handler behind the shared rate-limit gate', () => {
    // The gate moved from a hand-rolled `rateLimitRequest` call in this route
    // to withApiRoute, which applies it before the handler runs.
    expect(src).toContain("import { withApiRoute } from '@/lib/api/with-api-route'");
    expect(src).toMatch(/return withApiRoute\(\s*request\s*,/);
  });
});

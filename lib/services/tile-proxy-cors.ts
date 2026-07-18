/**
 * CORS headers for the tile-proxy routes (NOAA WMS, Iowa NEXRAD).
 * Phase 2 audit flagged that these proxies returned
 * `Access-Control-Allow-Origin: *` with no rate limit, letting any third-party
 * site use them as a free fetch proxy.
 *
 * Allow-list policy:
 *   - The production origin (NEXT_PUBLIC_BASE_URL or the hardcoded fallback).
 *   - Any *.vercel.app subdomain — covers preview deploys without manual
 *     env-var management per branch.
 *
 * Same-origin requests don't actually need CORS headers, so the headers are
 * only material for browsers loading the tile cross-origin (which today is
 * "preview deploy hitting the prod tile proxy" and "main site"). If a
 * legitimate third-party consumer ever appears, name it and add it here —
 * do NOT revert to '*'.
 */

const PROD_ORIGIN = 'https://www.16bitweather.co';

function configuredProdOrigin(): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (base && /^https?:\/\//.test(base)) return base.replace(/\/$/, '');
  return PROD_ORIGIN;
}

/**
 * Decide whether a request's Origin should be reflected back as the
 * Access-Control-Allow-Origin value. Returns the allowed origin string or
 * null if the request origin isn't permitted.
 */
function resolveAllowedOrigin(requestOrigin: string | null): string | null {
  const prodOrigin = configuredProdOrigin();
  if (!requestOrigin) {
    // No Origin header (same-origin / non-browser). Return prod as a safe
    // default — same-origin requests don't enforce CORS anyway, so this is
    // only meaningful for non-browser clients which don't care.
    return prodOrigin;
  }
  if (requestOrigin === prodOrigin) return requestOrigin;
  try {
    const parsed = new URL(requestOrigin);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    // THIS project's preview deploys only. vercel.app is a multi-tenant
    // apex, and a prefix-only match was still spoofable: any tenant can
    // name their project "weather-application" and get
    // weather-application-<hash>-<their-scope>.vercel.app. Anchor on the
    // team scope suffix instead — Vercel team slugs are globally unique,
    // and a hostile project name cannot produce a hostname ENDING in our
    // scope (their own scope slug is always appended after it).
    //   weather-application-<hash>-justin-elrods-projects.vercel.app
    //   weather-application-git-<branch>-justin-elrods-projects.vercel.app
    const host = parsed.hostname.toLowerCase();
    if (/^weather-application-[a-z0-9-]+-justin-elrods-projects\.vercel\.app$/.test(host)) {
      return requestOrigin;
    }
    // Belt and suspenders for a future project/team rename: the deployment's
    // own hostnames are exposed at runtime (bare hosts, but normalize
    // defensively).
    const selfHosts = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
      .filter((v): v is string => Boolean(v))
      .map((v) => v.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''));
    if (selfHosts.includes(host)) {
      return requestOrigin;
    }
  } catch {
    return null;
  }
  return null;
}

export function tileProxyOriginHeaders(request: Request | { headers: Headers }): Record<string, string> {
  const requestOrigin = request.headers.get('origin');
  const allowed = resolveAllowedOrigin(requestOrigin);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    // Tell intermediaries (CDN, browser cache) that the response varies
    // by Origin so a permitted-origin response isn't served from cache to
    // a non-permitted one.
    'Vary': 'Origin',
  };
  if (allowed) {
    headers['Access-Control-Allow-Origin'] = allowed;
  }
  return headers;
}

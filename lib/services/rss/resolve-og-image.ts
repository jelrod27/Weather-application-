/**
 * Resolve og:image / twitter:image from article HTML (first ~48 KB only).
 * Cached in-memory with a short TTL to avoid hammering publishers.
 */

import { decodeHtmlEntities } from '@/lib/services/rss/html-utils';
import { safeExternalUrl, upgradeFeedImageUrl } from '@/lib/safe-url';

const OG_CACHE = new Map<string, { url: string | null; expires: number }>();
const OG_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 48_000;

const OG_PATTERNS = [
  /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
  /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
];

/** Hosts where OG fetch is unlikely to yield a story photo. */
const SKIP_OG_HOSTS = [
  'forecast.weather.gov',
  'alerts.weather.gov',
  'www.weather.gov/alerts',
];

export function shouldAttemptOgImage(articleUrl: string): boolean {
  try {
    const host = new URL(articleUrl).hostname.toLowerCase();
    if (SKIP_OG_HOSTS.some((skip) => host === skip || host.endsWith(`.${skip}`))) {
      return false;
    }
    // NHC index pages are outlook text, not story art.
    if (host === 'www.nhc.noaa.gov' && /nhc\.noaa\.gov\/?$/.test(articleUrl)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function resolveOgImage(articleUrl: string): Promise<string | null> {
  const cached = OG_CACHE.get(articleUrl);
  if (cached && cached.expires > Date.now()) return cached.url;

  let resolved: string | null = null;
  if (shouldAttemptOgImage(articleUrl)) {
    resolved = await fetchOgImage(articleUrl);
  }

  OG_CACHE.set(articleUrl, { url: resolved, expires: Date.now() + OG_CACHE_TTL_MS });
  return resolved;
}

async function fetchOgImage(articleUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(articleUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': '16-Bit Weather RSS Aggregator/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;

    const reader = response.body?.getReader();
    if (!reader) return null;

    let html = '';
    let bytes = 0;
    while (bytes < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      html += new TextDecoder().decode(value);
      bytes += value.length;
    }
    reader.cancel().catch(() => undefined);

    return parseOgImageFromHtml(html, articleUrl);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function parseOgImageFromHtml(html: string, pageUrl: string): string | null {
  for (const pattern of OG_PATTERNS) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    const candidate = decodeHtmlEntities(match[1].trim());
    const absolute = resolveMaybeRelativeUrl(candidate, pageUrl);
    const safe = absolute ? safeExternalUrl(upgradeFeedImageUrl(absolute)) : null;
    if (safe && !isGenericSiteLogo(safe)) return safe;
  }
  return null;
}

function resolveMaybeRelativeUrl(raw: string, pageUrl: string): string | null {
  try {
    return new URL(raw, pageUrl).href;
  } catch {
    return null;
  }
}

/** Skip generic mastheads that Carbon Brief and similar sites expose as og:image. */
function isGenericSiteLogo(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('website-masthead') ||
    lower.includes('/logo.') ||
    lower.includes('site-logo') ||
    lower.includes('default-og') ||
    lower.includes('meatball') ||
    lower.includes('nasa-logo') ||
    lower.includes('/wp-content/uploads/2022/02/nasa_meatball')
  );
}

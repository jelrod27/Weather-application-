/**
 * Allow-list of hosts that may appear in <a href> or <img src> inside
 * AI-generated blog posts. Sourced from scripts/newsletter/images.ts (the
 * curated catalog the newsletter pipeline picks from) plus our own host.
 *
 * Phase 3 (P3-img-host-Med + Phase 2 C-Link7-Low): rehype-sanitize allows
 * any HTTPS host in <a> and <img> by default. An indirect prompt injection
 * via news headlines could steer the model into embedding tracker pixels or
 * phishing links. The allow-list is the second line of defense after PR
 * review.
 *
 * Keep in sync with scripts/newsletter/images.ts when new image sources are
 * added. There is no automated linkage between the two — adding a host here
 * without adding to images.ts is fine; adding to images.ts without here will
 * cause hero images to render as placeholders.
 */

export const ALLOWED_BLOG_LINK_HOSTS: ReadonlySet<string> = new Set([
  // Curated newsletter image sources (kept in sync with scripts/newsletter/images.ts)
  'commons.wikimedia.org',
  'cdn.star.nesdis.noaa.gov',
  'droughtmonitor.unl.edu',
  'ocean.weather.gov',
  'radar.weather.gov',
  'sdo.gsfc.nasa.gov',
  'services.swpc.noaa.gov',
  'soho.nascom.nasa.gov',
  'www.cpc.ncep.noaa.gov',
  'www.spc.noaa.gov',
  'www.wpc.ncep.noaa.gov',

  // Self-references in posts (canonical links back to the site).
  '16bitweather.co',
  'www.16bitweather.co',

  // External authorities reasonable to link to from a weather post.
  'www.weather.gov',
  'www.noaa.gov',
  'earthquake.usgs.gov',
  'www.spc.noaa.gov',
  'www.nhc.noaa.gov',
]);

/**
 * Returns the input URL only if its host is in the allow-list. Returns null
 * otherwise. Relative/protocol-relative inputs return null (they shouldn't
 * appear in AI-generated content). Inputs that fail URL parsing return null.
 */
export function allowedBlogUrl(href: string | undefined | null): string | null {
  if (!href || typeof href !== 'string') return null;
  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    return null;
  }
  // HTTPS only — `http:` images become mixed content on the HTTPS site
  // (browsers block them), and `http:` <a href> downgrades the security
  // properties of any outbound link from a generated post.
  if (parsed.protocol !== 'https:') return null;
  return ALLOWED_BLOG_LINK_HOSTS.has(parsed.hostname.toLowerCase()) ? href : null;
}

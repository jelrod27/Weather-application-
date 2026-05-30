/**
 * URL scheme guard for any href/src that originates from an external feed
 * (RSS, Reddit, Launch Library, USGS, etc.).
 *
 * `<a href="javascript:...">` and `window.open('javascript:...')` both execute
 * the URI as script. CSP `script-src 'unsafe-inline'` (currently set in
 * middleware.ts) does not block this — the only defense is to refuse
 * non-http(s) URLs at every render or open call site.
 *
 * Usage at render: `const safe = safeExternalUrl(item.url); if (!safe) return <span>...`
 * Usage at parser: drop items whose URL fails this check before storing.
 */
export function safeExternalUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !url) return null;
  try {
    const parsed = new URL(url, 'https://placeholder.invalid');
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? url : null;
  } catch {
    return null;
  }
}

/**
 * Upgrade an `http://` image URL to `https://`.
 *
 * Our pages are served over HTTPS and the CSP `img-src` directive only allows
 * `https:` (see middleware.ts), so an `http://` image — common in RSS feed
 * items even when the feed itself is HTTPS — is blocked as mixed content and
 * never renders. Most image CDNs serve the same asset over HTTPS, so a scheme
 * upgrade recovers the bulk of them; anything that genuinely lacks HTTPS still
 * fails to load and the caller falls back. Non-`http://` inputs (https,
 * protocol-relative, relative, data:) are returned unchanged.
 */
export function upgradeImageUrl(url: string): string {
  return url.startsWith('http://') ? `https://${url.slice('http://'.length)}` : url;
}

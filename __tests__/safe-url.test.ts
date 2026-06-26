import { safeExternalUrl, upgradeFeedImageUrl, upgradeImageUrl } from '@/lib/safe-url';

describe('safeExternalUrl', () => {
  test('drops javascript: URI', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('JavaScript:alert(1)')).toBeNull();
    expect(safeExternalUrl(' javascript:alert(1)')).toBeNull();
  });

  test('drops data: URI (would enable HTML/SVG XSS via window.open)', () => {
    expect(safeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeExternalUrl('data:image/svg+xml;base64,PHN2Zw==')).toBeNull();
  });

  test('drops other non-http schemes', () => {
    expect(safeExternalUrl('vbscript:msgbox')).toBeNull();
    expect(safeExternalUrl('file:///etc/passwd')).toBeNull();
    expect(safeExternalUrl('ftp://example.com')).toBeNull();
  });

  test('drops null, undefined, non-string, and empty', () => {
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
    expect(safeExternalUrl('')).toBeNull();
    expect(safeExternalUrl(42)).toBeNull();
    expect(safeExternalUrl({})).toBeNull();
  });

  test('passes valid http(s) URLs through unchanged', () => {
    expect(safeExternalUrl('https://example.com/path?q=1')).toBe('https://example.com/path?q=1');
    expect(safeExternalUrl('http://example.com')).toBe('http://example.com');
    expect(safeExternalUrl('https://www.reddit.com/r/weather/comments/x/y/')).toBe(
      'https://www.reddit.com/r/weather/comments/x/y/'
    );
  });

  test('handles malformed inputs without throwing', () => {
    // Malformed-but-parseable URLs that resolve to http(s) on the placeholder
    // host are returned verbatim — the browser will render them as relative
    // URLs on the page origin, which is not an XSS surface.
    expect(safeExternalUrl('://no-scheme')).toBe('://no-scheme');
    // `https://` (no host) makes the URL constructor throw → returns null.
    expect(safeExternalUrl('https://')).toBeNull();
  });
});

describe('upgradeImageUrl', () => {
  test('upgrades http:// to https:// so CSP img-src does not block it', () => {
    expect(upgradeImageUrl('http://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
  });

  test('leaves https:// unchanged', () => {
    expect(upgradeImageUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
  });

  test('leaves protocol-relative, relative, and data URLs unchanged', () => {
    expect(upgradeImageUrl('//cdn.example.com/a.jpg')).toBe('//cdn.example.com/a.jpg');
    expect(upgradeImageUrl('/local/a.jpg')).toBe('/local/a.jpg');
    expect(upgradeImageUrl('data:image/png;base64,iVBOR')).toBe('data:image/png;base64,iVBOR');
  });

  test('only rewrites the leading scheme, not http in the path or query', () => {
    expect(upgradeImageUrl('http://host/redirect?to=http://other.com/x.jpg')).toBe(
      'https://host/redirect?to=http://other.com/x.jpg'
    );
  });

  test('round-trips through safeExternalUrl to a renderable https URL', () => {
    expect(safeExternalUrl(upgradeImageUrl('http://cdn.example.com/a.jpg'))).toBe(
      'https://cdn.example.com/a.jpg'
    );
  });
});

describe('upgradeFeedImageUrl', () => {
  test('upgrades Phys.org 90px RSS thumbnails to 800px article images', () => {
    expect(
      upgradeFeedImageUrl('https://scx1.b-cdn.net/csz/news/tmb/2026/wheelchair-outside.jpg'),
    ).toBe('https://scx1.b-cdn.net/csz/news/800a/2026/wheelchair-outside.jpg');
  });

  test('upgrades ScienceDaily 150px previews to 1920px hero images', () => {
    expect(
      upgradeFeedImageUrl('https://www.sciencedaily.com/images/150/preview.webp'),
    ).toBe('https://www.sciencedaily.com/images/1920/preview.webp');
  });

  test('still upgrades http to https', () => {
    expect(
      upgradeFeedImageUrl('http://scx2.b-cdn.net/csz/news/tmb/2026/sample.jpg'),
    ).toBe('https://scx2.b-cdn.net/csz/news/800a/2026/sample.jpg');
  });
});

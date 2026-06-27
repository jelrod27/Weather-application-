/**
 * SEO tests for sitemap generation and next.config redirect rules.
 */

describe('Sitemap SEO', () => {
  it('next.config should not redirect /sitemap.xml (breaks Next.js built-in sitemap)', async () => {
    const configModule = await import('../next.config.mjs')
    const nextConfig = configModule.default

    const redirects = typeof nextConfig.redirects === 'function'
      ? await nextConfig.redirects()
      : nextConfig.redirects || []

    const sitemapRedirect = redirects.find(
      (r: { source: string }) => r.source === '/sitemap.xml'
    )
    expect(sitemapRedirect).toBeUndefined()
  })

  it('sitemap should not include URLs that permanently redirect', async () => {
    const configModule = await import('../next.config.mjs')
    const nextConfig = configModule.default

    const redirects = typeof nextConfig.redirects === 'function'
      ? await nextConfig.redirects()
      : nextConfig.redirects || []

    const permanentRedirectSources = redirects
      .filter((r: { permanent: boolean }) => r.permanent)
      .map((r: { source: string }) => r.source)

    const { default: sitemap } = await import('../app/sitemap')
    const entries = await sitemap()
    const sitemapPaths = entries.map((e: { url: string }) => {
      try { return new URL(e.url).pathname } catch { return e.url }
    })

    for (const redirectSource of permanentRedirectSources) {
      expect(sitemapPaths).not.toContain(redirectSource)
    }
  })

  it('dev/utility pages should have noindex metadata', async () => {
    const devPages = [
      { path: '../app/test-sentry/layout', name: 'test-sentry' },
      { path: '../app/radar-diagnostic/layout', name: 'radar-diagnostic' },
      { path: '../app/gfs-model/layout', name: 'gfs-model' },
      { path: '../app/auth/layout', name: 'auth' },
    ]

    for (const page of devPages) {
      const mod = await import(page.path)
      expect(mod.metadata?.robots?.index).toBe(false)
    }
  })

  it('sitemap should include /education/glossary', async () => {
    const { default: sitemap } = await import('../app/sitemap')
    const entries = await sitemap()
    const sitemapPaths = entries.map((e: { url: string }) => {
      try { return new URL(e.url).pathname } catch { return e.url }
    })

    expect(sitemapPaths).toContain('/education/glossary')
  })

  it('sitemap should not include noindex or redirect-only URLs', async () => {
    const { default: sitemap } = await import('../app/sitemap')
    const entries = await sitemap()
    const sitemapPaths = entries.map((e: { url: string }) => {
      try { return new URL(e.url).pathname } catch { return e.url }
    })

    expect(sitemapPaths).not.toContain('/hourly')
    expect(sitemapPaths).not.toContain('/map')
  })

  it('sitemap should include stargazer hub and deep-sky object pages', async () => {
    const { default: sitemap } = await import('../app/sitemap')
    const entries = await sitemap()
    const sitemapPaths = entries.map((e: { url: string }) => {
      try { return new URL(e.url).pathname } catch { return e.url }
    })

    expect(sitemapPaths).toContain('/stargazer')
    expect(sitemapPaths.some((p) => p.startsWith('/stargazer/objects/'))).toBe(true)
  })
})

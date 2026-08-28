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
      .filter((r: { permanent: boolean; has?: unknown }) => r.permanent && !r.has)
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
    expect(sitemapPaths).toContain('/alerts')
    expect(sitemapPaths).not.toContain('/llms.txt')
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

  it('sitemap should include stargazer hub but not deep-sky object pages', async () => {
    const { default: sitemap } = await import('../app/sitemap')
    const entries = await sitemap()
    const sitemapPaths = entries.map((e: { url: string }) => {
      try { return new URL(e.url).pathname } catch { return e.url }
    })

    expect(sitemapPaths).toContain('/stargazer')
    expect(sitemapPaths.some((p) => p.startsWith('/stargazer/objects/'))).toBe(false)
  })

  it('sitemap should include all shareable education detail guide pages', async () => {
    const {
      FEATURED_DETAIL_SLUGS,
      getAllWeatherSystemSlugs,
      getEducationDetailHref,
    } = await import('@/lib/education/entries')
    const { default: sitemap } = await import('../app/sitemap')
    const entries = await sitemap()
    const sitemapPaths = entries.map((e: { url: string }) => {
      try { return new URL(e.url).pathname } catch { return e.url }
    })

    const expectedPaths = [
      ...getAllWeatherSystemSlugs().map((slug) =>
        getEducationDetailHref('weather-system', slug),
      ),
      ...FEATURED_DETAIL_SLUGS.cloud.map((slug) => getEducationDetailHref('cloud', slug)),
      ...FEATURED_DETAIL_SLUGS.phenomenon.map((slug) => getEducationDetailHref('phenomenon', slug)),
    ]

    expect(expectedPaths.length).toBeGreaterThan(20)
    for (const path of expectedPaths) {
      expect(sitemapPaths).toContain(path)
    }
  })

  it('sitemap lastmod values are bucketed, not request-time now()', async () => {
    const { startOfUtcHour, startOfUtcDay, startOfUtcWeek, startOfUtcMonth } = await import(
      '@/lib/seo/sitemap-lastmod'
    )
    const { default: sitemap } = await import('../app/sitemap')
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-08-27T21:17:44.123Z'))
    try {
      const entries = await sitemap()
      const byPath = new Map(
        entries.map((e: { url: string; lastModified?: Date | string }) => {
          const pathname = new URL(e.url).pathname
          const lastModified = e.lastModified instanceof Date ? e.lastModified : new Date(String(e.lastModified))
          return [pathname, lastModified]
        }),
      )

      expect(byPath.get('/')?.toISOString()).toBe(startOfUtcDay().toISOString())
      expect(byPath.get('/space-weather')?.toISOString()).toBe(startOfUtcHour().toISOString())
      expect(byPath.get('/education/glossary')?.toISOString()).toBe(startOfUtcMonth().toISOString())
      expect(byPath.get('/weather/boston-ma')?.toISOString()).toBe(startOfUtcWeek().toISOString())
    } finally {
      jest.useRealTimers()
    }
  })
})

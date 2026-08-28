/**
 * Tests for SEO indexing fixes to resolve "Discovered - currently not indexed" in GSC.
 */

import fs from 'fs'
import path from 'path'

describe('SEO Indexing Fixes', () => {
  it('robots.txt should not contain Crawl-delay directives', () => {
    const robotsPath = path.join(process.cwd(), 'public', 'robots.txt')
    const content = fs.readFileSync(robotsPath, 'utf-8')

    expect(content.toLowerCase()).not.toContain('crawl-delay')
  })

  it('robots.txt should explicitly allow key indexable sections', () => {
    const robotsPath = path.join(process.cwd(), 'public', 'robots.txt')
    const content = fs.readFileSync(robotsPath, 'utf-8')

    const requiredAllows = ['/blog', '/news', '/education', '/aviation', '/weather/']
    for (const route of requiredAllows) {
      expect(content).toContain(`Allow: ${route}`)
    }
  })

  it('page-wrapper should contain a footer with internal links to key sections', () => {
    const wrapperPath = path.join(process.cwd(), 'components', 'page-wrapper.tsx')
    const content = fs.readFileSync(wrapperPath, 'utf-8')

    expect(content).toContain('<footer')
    const requiredLinks = ['/radar', '/severe', '/aviation', '/education', '/education/glossary', '/blog', '/news', '/about']
    for (const link of requiredLinks) {
      expect(content).toContain(`href="${link}"`)
    }
    expect(content).toContain('/education/glossary')
    expect(content).toContain('getFeaturedCities')
    expect(content).toContain('/weather/${city.slug}')
  })

  it('homepage should server-render featured city links for crawlers', () => {
    const pagePath = path.join(process.cwd(), 'app', 'page.tsx')
    const content = fs.readFileSync(pagePath, 'utf-8')

    expect(content).toContain('FeaturedCityLinks')
    expect(content).toContain('Weather by city')
    expect(content).toContain('HOMEPAGE_TITLE')
    expect(content).not.toContain('Retro Terminal Weather Forecast App')
  })

  it('glossary layout should include breadcrumb and featured city links', () => {
    const layoutPath = path.join(process.cwd(), 'app', 'education', 'glossary', 'layout.tsx')
    const content = fs.readFileSync(layoutPath, 'utf-8')

    expect(content).toContain('BreadcrumbList')
    expect(content).toContain('FeaturedCityLinks')
    expect(content).toContain('English Weather Glossary')
    expect(content).toContain("inLanguage: 'en'")
  })

  it('sitemap should not include /ai route', async () => {
    const { default: sitemap } = await import('../app/sitemap')
    const entries = await sitemap()
    const paths = entries.map((e: { url: string }) => {
      try { return new URL(e.url).pathname } catch { return e.url }
    })

    expect(paths).not.toContain('/ai')
  })

  it('sitemap should stay under a soft cap to focus crawl budget', async () => {
    const { default: sitemap } = await import('../app/sitemap')
    const entries = await sitemap()

    // ~100 cities, blog posts, education detail pages, and static routes (no deep-sky objects).
    expect(entries.length).toBeLessThan(250)
  })

  it('city pages should use ISR revalidate instead of force-dynamic', () => {
    const pagePath = path.join(process.cwd(), 'app', 'weather', '[city]', 'page.tsx')
    const content = fs.readFileSync(pagePath, 'utf-8')

    expect(content).toContain('revalidate')
    expect(content).not.toContain("dynamic = 'force-dynamic'")
    expect(content).toContain('defaultOpen')
    expect(content).toContain('PRIORITY_SEO_CITY_SLUGS')
  })

  it('hourly layout should noindex and omit JSON-LD', () => {
    const layoutPath = path.join(process.cwd(), 'app', 'hourly', 'layout.tsx')
    const content = fs.readFileSync(layoutPath, 'utf-8')

    expect(content).toContain('index: false')
    expect(content).not.toContain('application/ld+json')
  })

  it('GFS run pages should repeat parent noindex', async () => {
    const layoutPath = path.join(
      process.cwd(),
      'app',
      'gfs-model',
      '[region]',
      '[run]',
      'layout.tsx',
    )
    const content = fs.readFileSync(layoutPath, 'utf-8')

    expect(content).toContain('index: false')
    expect(content).not.toContain('alternates')
  })

  it('blog missing posts should noindex', () => {
    const pagePath = path.join(process.cwd(), 'app', 'blog', '[slug]', 'page.tsx')
    const content = fs.readFileSync(pagePath, 'utf-8')

    expect(content).toContain("title: 'Post Not Found'")
    expect(content).toContain('index: false')
  })
})

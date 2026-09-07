/**
 * SEO tests for the server-rendered explainer sections added to the tool and
 * hub pages (audit findings T5, T18, T19).
 *
 * Two things are checked for every section:
 *  1. it renders enough evergreen copy to be worth indexing, and
 *  2. every FAQ answer in its FAQPage JSON-LD is also visible text on the page
 *     — Google treats FAQ markup for hidden content as a violation.
 */

import fs from 'fs'
import path from 'path'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import AlertsSeoContent from '@/components/alerts/alerts-seo-content'
import AviationSeoContent from '@/components/aviation/aviation-seo-content'
import EarthSciencesSeoContent from '@/components/earth-sciences/earth-sciences-seo-content'
import HomeSeoContent from '@/components/home/home-seo-content'
import NewsSeoContent from '@/components/news/news-seo-content'
import SevereSeoContent from '@/components/severe/severe-seo-content'
import StargazerSeoContent from '@/components/stargazer/stargazer-seo-content'
import WarningsSeoContent from '@/components/warnings/warnings-seo-content'
import WinterSeoContent from '@/components/winter/winter-seo-content'

type FaqJsonLd = {
  '@type': string
  mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>
}

function readPage(...segments: string[]): string {
  return fs.readFileSync(path.join(process.cwd(), ...segments), 'utf-8')
}

/**
 * Strip tags (JSON-LD script included) and normalise entities and whitespace.
 *
 * The script match is case-insensitive because `<SCRIPT>` is equally valid
 * markup, and is anchored on a word boundary so it cannot match a tag that
 * merely starts with those letters. `&amp;` is unescaped last: doing it
 * earlier turns `&amp;quot;` into a literal quote rather than the text
 * `&quot;`.
 */
function visibleText(markup: string): string {
  return markup
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseFaqJsonLd(markup: string): FaqJsonLd {
  const match = markup.match(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
  )
  expect(match).not.toBeNull()
  const raw = (match as RegExpMatchArray)[1]
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
  return JSON.parse(raw) as FaqJsonLd
}

const SECTIONS: Array<{ name: string; element: ReactElement; minWords: number }> = [
  { name: 'warnings', element: <WarningsSeoContent />, minWords: 150 },
  { name: 'severe', element: <SevereSeoContent />, minWords: 150 },
  { name: 'aviation', element: <AviationSeoContent />, minWords: 150 },
  { name: 'winter', element: <WinterSeoContent />, minWords: 150 },
  { name: 'news', element: <NewsSeoContent />, minWords: 150 },
  { name: 'stargazer', element: <StargazerSeoContent />, minWords: 150 },
  { name: 'earth-sciences', element: <EarthSciencesSeoContent />, minWords: 150 },
  { name: 'alerts', element: <AlertsSeoContent />, minWords: 150 },
]

describe('tool page SEO sections', () => {
  it.each(SECTIONS)('$name renders at least $minWords crawlable words', ({ element, minWords }) => {
    const words = visibleText(renderToStaticMarkup(element)).split(' ').filter(Boolean)
    expect(words.length).toBeGreaterThanOrEqual(minWords)
  })

  it.each(SECTIONS)('$name mirrors its visible FAQ in FAQPage JSON-LD', ({ element }) => {
    const markup = renderToStaticMarkup(element)
    const jsonLd = parseFaqJsonLd(markup)
    const text = visibleText(markup)

    expect(jsonLd['@type']).toBe('FAQPage')
    expect(jsonLd.mainEntity.length).toBeGreaterThanOrEqual(3)
    for (const entry of jsonLd.mainEntity) {
      expect(text).toContain(entry.name)
      expect(text).toContain(entry.acceptedAnswer.text)
    }
  })

  it.each(SECTIONS)('$name adds no second h1 to its page', ({ element }) => {
    expect(renderToStaticMarkup(element)).not.toContain('<h1')
  })
})

describe('homepage SEO section', () => {
  it('renders 200+ words of intro copy without a second h1', () => {
    const markup = renderToStaticMarkup(<HomeSeoContent />)
    const words = visibleText(markup).split(' ').filter(Boolean)

    expect(words.length).toBeGreaterThanOrEqual(200)
    expect(markup).not.toContain('<h1')
    expect(markup).toContain('<h2')
  })

  it('links into every major cluster', () => {
    const markup = renderToStaticMarkup(<HomeSeoContent />)

    for (const href of [
      '/radar',
      '/warnings',
      '/alerts',
      '/space-weather',
      '/education',
      '/weather/boston-ma',
    ]) {
      expect(markup).toContain(`href="${href}"`)
    }
  })

  it('declares an absolute raster Organization logo and sameAs profiles', () => {
    const page = readPage('app', 'page.tsx')

    expect(page).toContain('https://www.16bitweather.co')
    expect(page).toContain('/icon-512.png')
    expect(page).not.toContain('logo: `${SITE_URL}/favicon.svg`')
    expect(page).toContain('sameAs')
    expect(page).toContain('HomeSeoContent')
  })
})

describe('server-rendered page H1s (T18)', () => {
  it('warnings renders its H1 in the page, not the client desk', () => {
    expect(readPage('app', 'warnings', 'page.tsx')).toContain('<h1')
    expect(readPage('app', 'warnings', 'warnings-client.tsx')).not.toContain('<h1')
  })

  it('aviation renders its H1 outside the search-param Suspense boundary', () => {
    const page = readPage('app', 'aviation', 'page.tsx')
    const h1Index = page.indexOf('<h1')
    const suspenseIndex = page.indexOf('<AviationPageInner />')

    expect(h1Index).toBeGreaterThan(-1)
    expect(page.match(/<h1/g)).toHaveLength(1)
    expect(h1Index).toBeLessThan(suspenseIndex)
  })

  it('alerts renders its H1 and intro copy in the page so they land inside main', () => {
    expect(readPage('app', 'alerts', 'page.tsx')).toContain('<h1')
    expect(readPage('app', 'alerts', 'alerts-landing.tsx')).not.toContain('<h1')
  })
})

describe('tool pages render their SEO sections', () => {
  it.each([
    ['warnings', 'WarningsSeoContent'],
    ['severe', 'SevereSeoContent'],
    ['aviation', 'AviationSeoContent'],
    ['winter', 'WinterSeoContent'],
    ['news', 'NewsSeoContent'],
    ['stargazer', 'StargazerSeoContent'],
    ['earth-sciences', 'EarthSciencesSeoContent'],
    ['alerts', 'AlertsSeoContent'],
  ])('%s page renders %s', (route, component) => {
    expect(readPage('app', route, 'page.tsx')).toContain(`<${component} />`)
  })
})

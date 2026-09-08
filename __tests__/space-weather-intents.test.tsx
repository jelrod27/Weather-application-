/**
 * The /space-weather intent pages.
 *
 * The hub was the site's highest-impression page with zero clicks because it
 * answered a dozen searches at once. These assertions pin the things that make
 * the split worth having: one page per intent, each reachable, each carrying
 * its own metadata, and FAQ markup that never describes unrendered text.
 */

import fs from 'fs'
import path from 'path'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  SPACE_WEATHER_INTENTS,
  getSpaceWeatherIntent,
  intentHref,
  siblingIntents,
} from '@/lib/space-weather/intents'
import { classifyXrayFlux, parseLatestXrayFlux } from '@/lib/space-weather/xray'
import { KP_LEVELS, kpLevel } from '@/lib/space-weather/kp-scale'
import { buildIntentFaqJsonLd, buildIntentPageJsonLd } from '@/components/space-weather/intent-page-shell'

const BRAND_SUFFIX_LENGTH = ' | 16 Bit Weather'.length

describe('intent registry', () => {
  it('covers the four query clusters the hub was losing', () => {
    expect(SPACE_WEATHER_INTENTS.map((i) => i.slug)).toEqual([
      'solar-flares',
      'kp-index',
      'solar-wind',
      'aurora-forecast',
    ])
  })

  it('keeps every title inside the search-result budget', () => {
    for (const intent of SPACE_WEATHER_INTENTS) {
      expect(intent.title.length).toBeLessThanOrEqual(60 - BRAND_SUFFIX_LENGTH)
      expect(intent.title).not.toContain('16 Bit Weather')
      expect(intent.description.length).toBeLessThanOrEqual(160)
      expect(intent.description.length).toBeGreaterThan(70)
    }
  })

  it('gives each intent a distinct title and description', () => {
    const titles = SPACE_WEATHER_INTENTS.map((i) => i.title)
    const descriptions = SPACE_WEATHER_INTENTS.map((i) => i.description)
    expect(new Set(titles).size).toBe(titles.length)
    expect(new Set(descriptions).size).toBe(descriptions.length)
  })

  it('links every sibling but never itself', () => {
    for (const intent of SPACE_WEATHER_INTENTS) {
      const siblings = siblingIntents(intent.slug)
      expect(siblings).toHaveLength(SPACE_WEATHER_INTENTS.length - 1)
      expect(siblings.map((s) => s.slug)).not.toContain(intent.slug)
    }
  })

  it('resolves a known slug and rejects an unknown one', () => {
    expect(getSpaceWeatherIntent('kp-index')?.label).toBe('Kp index')
    expect(getSpaceWeatherIntent('nope')).toBeUndefined()
  })
})

describe('every intent has a page, and the hub links it', () => {
  it.each(SPACE_WEATHER_INTENTS.map((i) => i.slug))('%s has a route file', (slug) => {
    const file = path.join(process.cwd(), 'app', 'space-weather', slug, 'page.tsx')
    expect(fs.existsSync(file)).toBe(true)

    const source = fs.readFileSync(file, 'utf-8')
    // Live SWPC values are stamped into the HTML, so the page must revalidate.
    expect(source).toContain('revalidate')
    expect(source).toContain('IntentPageShell')
    // A server component must not call the site's own API over HTTP.
    expect(source).not.toMatch(/fetch\(\s*['"`]\/api\//)
  })

  it('is listed in the sitemap', async () => {
    const { default: sitemap } = await import('@/app/sitemap')
    const paths = (await sitemap()).map((entry: { url: string }) => new URL(entry.url).pathname)

    expect(paths).toContain('/space-weather')
    for (const intent of SPACE_WEATHER_INTENTS) {
      expect(paths).toContain(intentHref(intent.slug))
    }
  })

  it('is linked from the hub, so the pages are not orphans', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components', 'space-weather', 'space-weather-seo-content.tsx'),
      'utf-8',
    )
    expect(source).toContain('SPACE_WEATHER_INTENTS')
    expect(source).toContain('intentHref')
  })
})

describe('structured data', () => {
  it('builds a breadcrumb trail back to the hub', () => {
    const intent = getSpaceWeatherIntent('kp-index')!
    const jsonLd = buildIntentPageJsonLd(intent, '2026-09-07T21:00:00.000Z') as {
      dateModified?: string
      breadcrumb: { itemListElement: Array<{ name: string; item: string }> }
    }

    expect(jsonLd.dateModified).toBe('2026-09-07T21:00:00.000Z')
    expect(jsonLd.breadcrumb.itemListElement.map((i) => i.name)).toEqual([
      'Home',
      'Space Weather',
      'Kp index',
    ])
  })

  it('omits dateModified when the live feed gave no timestamp', () => {
    const jsonLd = buildIntentPageJsonLd(getSpaceWeatherIntent('solar-wind')!) as Record<
      string,
      unknown
    >
    expect(jsonLd).not.toHaveProperty('dateModified')
  })

  it('mirrors the FAQ that is rendered, and only that', () => {
    const faqs = [
      { question: 'Q one?', answer: 'A one.' },
      { question: 'Q two?', answer: 'A two.' },
    ]
    const jsonLd = buildIntentFaqJsonLd(faqs) as {
      mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>
    }
    expect(jsonLd.mainEntity).toHaveLength(2)
    expect(jsonLd.mainEntity[0].name).toBe('Q one?')
    expect(jsonLd.mainEntity[1].acceptedAnswer.text).toBe('A two.')
  })
})

describe('classifyXrayFlux', () => {
  it('names each decade the way SWPC does', () => {
    expect(classifyXrayFlux(2e-4)).toEqual({ flareClass: 'X', label: 'X2.0' })
    expect(classifyXrayFlux(1e-4)).toEqual({ flareClass: 'X', label: 'X1.0' })
    expect(classifyXrayFlux(5.4e-5)).toEqual({ flareClass: 'M', label: 'M5.4' })
    expect(classifyXrayFlux(1e-6)).toEqual({ flareClass: 'C', label: 'C1.0' })
    expect(classifyXrayFlux(3e-7)).toEqual({ flareClass: 'B', label: 'B3.0' })
    expect(classifyXrayFlux(5e-9)).toEqual({ flareClass: 'A', label: 'A0.5' })
  })
})

describe('parseLatestXrayFlux', () => {
  const row = (time_tag: string, flux: number, energy = '0.1-0.8nm') => ({ time_tag, energy, flux })

  it('takes the newest long-band sample', () => {
    const reading = parseLatestXrayFlux([
      row('2026-09-07T20:00:00Z', 1e-6),
      row('2026-09-07T21:00:00Z', 2e-5),
      row('2026-09-07T20:30:00Z', 9e-6),
    ])
    expect(reading?.label).toBe('M2.0')
    expect(reading?.timeTag).toBe('2026-09-07T21:00:00Z')
  })

  it('ignores the short-band channel flares are not classified on', () => {
    const reading = parseLatestXrayFlux([
      row('2026-09-07T21:00:00Z', 9e-4, '0.05-0.4nm'),
      row('2026-09-07T20:00:00Z', 1e-6),
    ])
    expect(reading?.label).toBe('C1.0')
  })

  it('returns null rather than inventing a quiet reading', () => {
    expect(parseLatestXrayFlux([])).toBeNull()
    expect(parseLatestXrayFlux(null)).toBeNull()
    expect(parseLatestXrayFlux([row('2026-09-07T21:00:00Z', 0)])).toBeNull()
    expect(parseLatestXrayFlux([{ time_tag: '', energy: '0.1-0.8nm', flux: 1e-6 }])).toBeNull()
  })
})

describe('kpLevel', () => {
  it('maps a reading to the NOAA G-scale', () => {
    expect(kpLevel(9).storm).toBe('G5 Extreme')
    expect(kpLevel(7).storm).toBe('G3 Strong')
    expect(kpLevel(5).storm).toBe('G1 Minor')
    expect(kpLevel(4).storm).toBe('Unsettled')
    expect(kpLevel(0).storm).toBe('Quiet')
  })

  it('pushes the viewline south as the storm strengthens', () => {
    expect(kpLevel(9).viewlineLatitude).toBeLessThan(kpLevel(5).viewlineLatitude)
    expect(kpLevel(5).viewlineLatitude).toBeLessThan(kpLevel(0).viewlineLatitude)
  })

  it('clamps rather than throwing on a value outside the scale', () => {
    expect(kpLevel(Number.NaN).storm).toBe('Quiet')
    expect(kpLevel(-1).storm).toBe('Quiet')
    expect(kpLevel(99).storm).toBe('G5 Extreme')
  })

  it('is ordered high to low so the lookup returns the first level reached', () => {
    const mins = KP_LEVELS.map((level) => level.minKp)
    expect(mins).toEqual([...mins].sort((a, b) => b - a))
  })
})

describe('IntentPageShell', () => {
  it('renders the reading, the FAQ and links to every sibling', async () => {
    const { default: IntentPageShell } = await import(
      '@/components/space-weather/intent-page-shell'
    )
    const intent = getSpaceWeatherIntent('solar-flares')!
    const faqs = [{ question: 'Rendered question?', answer: 'Rendered answer.' }]

    const markup = renderToStaticMarkup(
      <IntentPageShell intent={intent} reading={<p>Current X-ray flux: M2.0</p>} faqs={faqs}>
        <p>Body copy.</p>
      </IntentPageShell>,
    )

    expect(markup).toContain('Current X-ray flux: M2.0')
    expect(markup).toContain('Rendered question?')
    expect(markup).toContain('Rendered answer.')
    for (const sibling of siblingIntents(intent.slug)) {
      expect(markup).toContain(intentHref(sibling.slug))
    }
    // Exactly one h1: the shell owns the page heading.
    expect(markup.match(/<h1/g)).toHaveLength(1)
  })
})

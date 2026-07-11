/**
 * SEO tests for space-weather page crawlable content.
 */

import fs from 'fs'
import path from 'path'
import {
  buildSpaceWeatherAppJsonLd,
  buildSpaceWeatherFaqJsonLd,
  SPACE_WEATHER_FAQS,
} from '@/components/space-weather/space-weather-seo-content'

describe('Space Weather SEO', () => {
  it('space-weather page should be a server component with crawlable SEO content', () => {
    const pagePath = path.join(process.cwd(), 'app', 'space-weather', 'page.tsx')
    const content = fs.readFileSync(pagePath, 'utf-8')

    expect(content).not.toContain("'use client'")
    expect(content).toContain('SpaceWeatherSeoContent')
    expect(content).toContain('buildSpaceWeatherFaqJsonLd')
    expect(content).toContain('SpaceWeatherClient')
  })

  it('space-weather SEO content targets monitor/tracker queries', () => {
    const seoPath = path.join(
      process.cwd(),
      'components',
      'space-weather',
      'space-weather-seo-content.tsx',
    )
    const content = fs.readFileSync(seoPath, 'utf-8')

    expect(content).toContain('Solar Flare Monitor')
    expect(content).toContain('href="/stargazer"')
    expect(content).toContain('href="/blog"')
    expect(content).toContain('SPACE_WEATHER_FAQS')
  })

  it('builds FAQ and WebApplication JSON-LD', () => {
    const faq = buildSpaceWeatherFaqJsonLd()
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(SPACE_WEATHER_FAQS.length)

    const app = buildSpaceWeatherAppJsonLd()
    expect(app['@type']).toBe('WebApplication')
    expect(app.url).toBe('https://www.16bitweather.co/space-weather')
  })

  it('layout metadata includes high-intent keywords', () => {
    const layoutPath = path.join(process.cwd(), 'app', 'space-weather', 'layout.tsx')
    const content = fs.readFileSync(layoutPath, 'utf-8')

    expect(content).toContain('solar flare monitor')
    expect(content).toContain('space weather tracker')
    expect(content).toContain('Kp index live')
  })
})

/**
 * SEO tests for radar page crawlable content.
 */

import fs from 'fs'
import path from 'path'

describe('Radar SEO', () => {
  it('radar page should be a server component with crawlable SEO content', () => {
    const pagePath = path.join(process.cwd(), 'app', 'radar', 'page.tsx')
    const content = fs.readFileSync(pagePath, 'utf-8')

    expect(content).not.toContain("'use client'")
    expect(content).toContain('RadarSeoContent')
    expect(content).toContain('buildRadarFaqJsonLd')
    expect(content).toContain('RadarClient')
  })

  it('radar SEO content includes h1, FAQ, and internal links', () => {
    const seoPath = path.join(process.cwd(), 'components', 'radar', 'radar-seo-content.tsx')
    const content = fs.readFileSync(seoPath, 'utf-8')

    expect(content).toContain('<h1')
    expect(content).toContain('href="/warnings"')
    expect(content).toContain('href="/severe"')
    expect(content).toContain('RADAR_FAQS')
  })
})

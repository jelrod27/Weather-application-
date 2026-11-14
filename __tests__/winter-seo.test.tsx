import { renderToStaticMarkup } from 'react-dom/server'
import WinterSeoContent, { WINTER_FAQS } from '@/components/winter/winter-seo-content'
import { metadata } from '@/app/winter/layout'

describe('Winter forecast source guidance', () => {
  it('explains local accumulations and national probabilities without closure guarantees', () => {
    const markup = renderToStaticMarkup(<WinterSeoContent />)
    expect(markup).toContain('snow depth')
    expect(markup).toContain('published intervals')
    expect(markup).not.toContain('close roads and schools')
    expect(WINTER_FAQS.some(faq => faq.answer.includes('72'))).toBe(true)
  })
  it('describes the shipped forecast in metadata', () => {
    expect(metadata.description).toContain('probabilities')
    expect(metadata.description).toContain('local 72-hour forecasts')
  })
})

import { decodeHtmlEntities } from '@/lib/services/rss/html-utils'
import { validateRedirectPath } from '@/lib/utils/redirect-validation'

describe('education hub security', () => {
  it('strips HTML from blog display fields before render', () => {
    const malicious = '<script>alert(1)</script>Storm Report'
    expect(decodeHtmlEntities(malicious)).toBe('alert(1)Storm Report')
    expect(decodeHtmlEntities(malicious)).not.toContain('<')
    expect(decodeHtmlEntities(malicious)).not.toContain('>')
  })

  it('allows only shipped education detail redirect paths', () => {
    expect(validateRedirectPath('/education/glossary')).toBe('/education/glossary')
    expect(validateRedirectPath('/education/weather-systems/cyclones')).toBe(
      '/education/weather-systems/cyclones',
    )
    expect(validateRedirectPath('/education/cloud-types/cirrus')).toBe('/education/cloud-types/cirrus')
    expect(validateRedirectPath('/education/phenomena/thundersnow')).toBe(
      '/education/phenomena/thundersnow',
    )
    expect(validateRedirectPath('/education/fake/evil')).toBe('/dashboard')
  })
})

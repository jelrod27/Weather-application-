/**
 * Tests for blogHeroImage — the hero/banner fallback for posts whose
 * frontmatter heroImage is empty (regression: the 2026-06-12 biometeorology
 * post shipped with heroImage "" and the blog rendered without any picture).
 */

import { blogHeroImage } from '@/lib/blog/hero'

describe('blogHeroImage', () => {
  it('passes a non-empty frontmatter heroImage through untouched', () => {
    expect(
      blogHeroImage({
        title: 'Any Title',
        heroImage: 'https://ocean.weather.gov/P_sfc_full_ocean.gif',
        tags: ['weekly-recap'],
      })
    ).toBe('https://ocean.weather.gov/P_sfc_full_ocean.gif')
  })

  it('falls back to a generated OG banner with the encoded title when heroImage is empty', () => {
    const url = blogHeroImage({
      title: "Biometeorology: On April 27, 2012, a thunderstorm rolled through Melbourne's western suburbs",
      heroImage: '',
      tags: ['biometeorology', 'weather', 'science'],
    })
    expect(url.startsWith('/api/og/blog?title=')).toBe(true)
    expect(url).toContain(encodeURIComponent('Biometeorology: On April 27'))
    // 'weather'/'science' map to climate-earth → education accent
    expect(url).toContain('&type=education')
  })

  it('maps severe-weather tags to the severe OG accent', () => {
    const url = blogHeroImage({ title: 'Outbreak', heroImage: '', tags: ['tornadoes'] })
    expect(url).toContain('&type=severe')
  })

  it('maps space-weather tags to the space OG accent', () => {
    const url = blogHeroImage({ title: 'Flare', heroImage: '', tags: ['solar flare'] })
    expect(url).toContain('&type=space')
  })

  it('maps weekly-dispatch tags to the dispatch OG accent', () => {
    const url = blogHeroImage({ title: 'This Week in Weather', heroImage: '', tags: ['weekly-recap', 'roadmap'] })
    expect(url).toContain('&type=dispatch')
  })

  it('defaults to education for unmapped tags', () => {
    const url = blogHeroImage({ title: 'Mystery Topic', heroImage: '', tags: ['something-new'] })
    expect(url).toContain('&type=education')
  })

  it('severe wins over space when both categories are tagged (canonical order)', () => {
    const url = blogHeroImage({ title: 'Sun and Storms', heroImage: '', tags: ['solar flare', 'tornadoes'] })
    expect(url).toContain('&type=severe')
  })
})

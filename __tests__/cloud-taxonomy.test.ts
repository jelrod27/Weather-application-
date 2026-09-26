import { cloudDatabase } from '@/data/cloud-types'
import { CLOUD_TYPES_FAQ, buildCloudTypesFaqJsonLd } from '@/lib/education/cloud-types-faq'
import { getGuideContent, isAllowedSourceUrl } from '@/lib/education/content'
import { getCloudBySlug } from '@/lib/education/entries'

describe('WMO cloud taxonomy', () => {
  it('keeps exactly the ten genera in the genus filter', () => {
    expect(cloudDatabase.filter((cloud) => cloud.cloudType === 'genus').map((cloud) => cloud.name).sort()).toEqual([
      'ALTOCUMULUS', 'ALTOSTRATUS', 'CIRROCUMULUS', 'CIRROSTRATUS', 'CIRRUS',
      'CUMULONIMBUS', 'CUMULUS', 'NIMBOSTRATUS', 'STRATOCUMULUS', 'STRATUS',
    ])
  })

  it.each([
    ['lenticular', 'species', ['Altocumulus', 'Cirrocumulus', 'Stratocumulus']],
    ['mammatus', 'feature', ['Cirrus', 'Cirrocumulus', 'Altocumulus', 'Altostratus', 'Stratocumulus', 'Cumulonimbus']],
    ['asperitas', 'feature', ['Altocumulus', 'Stratocumulus']],
  ] as const)('preserves the %s URL with its correct classification and parents', (slug, cloudType, parents) => {
    const cloud = getCloudBySlug(slug)
    expect(cloud?.cloudType).toBe(cloudType)
    expect(cloud?.parentGenus?.split(' / ')).toEqual(parents)
  })

  it('keeps the lenticular WMO reference through the guide loader', () => {
    const url = 'https://cloudatlas.wmo.int/en/clouds-species-lenticularis.html'
    expect(isAllowedSourceUrl(url)).toBe(true)
    expect(isAllowedSourceUrl('https://cloudatlas.wmo.int.example.com/en/clouds-genera.html')).toBe(false)
    expect(getGuideContent('cloud', 'lenticular')?.sources.map((source) => source.url)).toContain(url)
  })

  it('uses the visible taxonomy FAQ verbatim in structured data', () => {
    expect(buildCloudTypesFaqJsonLd().mainEntity).toEqual(CLOUD_TYPES_FAQ.map((entry) => ({
      '@type': 'Question', name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })))
  })
})

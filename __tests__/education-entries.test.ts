import {
  FEATURED_DETAIL_SLUGS,
  countEncyclopediaEntries,
  countShareableGuidePages,
  getAllWeatherSystemSlugs,
  getCloudBySlug,
  getEducationDetailHref,
  getPhenomenonBySlug,
  getWeatherSystemBySlug,
} from '@/lib/education/entries'
import { cloudDatabase } from '@/data/cloud-types'
import { weatherPhenomena } from '@/data/fun-facts'
import { weatherSystemsDatabase } from '@/data/weather-systems'

describe('education entries', () => {
  it('counts encyclopedia entries from all databases', () => {
    const expected =
      weatherSystemsDatabase.length + cloudDatabase.length + weatherPhenomena.length
    expect(countEncyclopediaEntries()).toBe(expected)
  })

  it('resolves featured weather system slugs', () => {
    expect(getWeatherSystemBySlug('cyclones')?.name).toBe('CYCLONES')
    expect(getWeatherSystemBySlug('jet-streams')?.name).toBe('JET STREAMS')
  })

  it('generates slugs for every weather system encyclopedia entry', () => {
    const slugs = getAllWeatherSystemSlugs()
    expect(slugs).toHaveLength(weatherSystemsDatabase.length)
    expect(slugs.every((slug) => getWeatherSystemBySlug(slug))).toBe(true)
  })

  it('counts shareable guide pages', () => {
    expect(countShareableGuidePages()).toBe(
      weatherSystemsDatabase.length +
        FEATURED_DETAIL_SLUGS.cloud.length +
        FEATURED_DETAIL_SLUGS.phenomenon.length,
    )
  })

  it('resolves featured cloud slugs', () => {
    expect(getCloudBySlug('cumulonimbus')?.name).toBe('CUMULONIMBUS')
    expect(getCloudBySlug('lenticular')?.name).toBe('LENTICULAR')
  })

  it('resolves featured phenomenon slugs', () => {
    expect(getPhenomenonBySlug('thundersnow')?.name).toBe('Thundersnow')
    expect(getPhenomenonBySlug('ball-lightning')?.name).toBe('Ball Lightning')
  })

  it('builds detail hrefs under /education', () => {
    expect(getEducationDetailHref('weather-system', 'cyclones')).toBe(
      '/education/weather-systems/cyclones',
    )
    expect(getEducationDetailHref('cloud', 'cirrus')).toBe('/education/cloud-types/cirrus')
    expect(getEducationDetailHref('phenomenon', 'haboob')).toBe('/education/phenomena/haboob')
  })

  it('defines featured spotlight pages for hub highlights', () => {
    const spotlightTotal =
      FEATURED_DETAIL_SLUGS['weather-system'].length +
      FEATURED_DETAIL_SLUGS.cloud.length +
      FEATURED_DETAIL_SLUGS.phenomenon.length
    expect(spotlightTotal).toBe(20)
  })
})

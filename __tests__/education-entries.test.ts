import {
  FEATURED_DETAIL_SLUGS,
  countEncyclopediaEntries,
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

  it('defines exactly 20 featured detail pages', () => {
    const total =
      FEATURED_DETAIL_SLUGS['weather-system'].length +
      FEATURED_DETAIL_SLUGS.cloud.length +
      FEATURED_DETAIL_SLUGS.phenomenon.length
    expect(total).toBe(20)
  })
})

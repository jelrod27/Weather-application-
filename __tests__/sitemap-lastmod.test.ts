import {
  startOfUtcDay,
  startOfUtcHour,
  startOfUtcMonth,
  startOfUtcWeek,
} from '@/lib/seo/sitemap-lastmod'

describe('sitemap lastmod buckets', () => {
  const now = new Date('2026-08-27T21:17:44.123Z')

  it('floors live-hub timestamps to the UTC hour', () => {
    expect(startOfUtcHour(now).toISOString()).toBe('2026-08-27T21:00:00.000Z')
  })

  it('floors homepage timestamps to the UTC day', () => {
    expect(startOfUtcDay(now).toISOString()).toBe('2026-08-27T00:00:00.000Z')
  })

  it('floors city timestamps to Monday 00:00 UTC', () => {
    expect(startOfUtcWeek(now).toISOString()).toBe('2026-08-24T00:00:00.000Z')
  })

  it('floors education timestamps to the first of the UTC month', () => {
    expect(startOfUtcMonth(now).toISOString()).toBe('2026-08-01T00:00:00.000Z')
  })
})

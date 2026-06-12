import { normalizeUnits, parseFeedCategories } from '@/lib/api/query-params'

describe('normalizeUnits', () => {
  it('returns metric for "metric"', () => {
    expect(normalizeUnits('metric')).toBe('metric')
  })

  it('returns imperial for "imperial"', () => {
    expect(normalizeUnits('imperial')).toBe('imperial')
  })

  it('returns standard for "standard"', () => {
    expect(normalizeUnits('standard')).toBe('standard')
  })

  it('returns imperial for null (absent param)', () => {
    expect(normalizeUnits(null)).toBe('imperial')
  })

  it('returns imperial for injection attempt "imperial&lang=xx"', () => {
    expect(normalizeUnits('imperial&lang=xx')).toBe('imperial')
  })

  it('returns imperial for "METRIC" (case-sensitive)', () => {
    expect(normalizeUnits('METRIC')).toBe('imperial')
  })
})

describe('parseFeedCategories', () => {
  it('returns undefined for null (absent param)', () => {
    expect(parseFeedCategories(null)).toBeUndefined()
  })

  it('returns undefined for empty string (empty param = all feeds, preserving mainline behavior)', () => {
    expect(parseFeedCategories('')).toBeUndefined()
  })

  it('returns matching categories for "severe,space"', () => {
    expect(parseFeedCategories('severe,space')).toEqual(['severe', 'space'])
  })

  it('trims whitespace around category names', () => {
    expect(parseFeedCategories('severe, space')).toEqual(['severe', 'space'])
  })

  it('returns empty array for entirely bogus input', () => {
    expect(parseFeedCategories('bogus,<script>')).toEqual([])
  })

  it('filters out unknown values while keeping valid ones', () => {
    expect(parseFeedCategories('severe,bogus')).toEqual(['severe'])
  })
})

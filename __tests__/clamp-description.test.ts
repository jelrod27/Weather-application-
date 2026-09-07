import { clampDescription, MAX_DESCRIPTION_LENGTH } from '@/lib/seo/clamp-description'

describe('clampDescription', () => {
  it('returns short text unchanged, with whitespace collapsed', () => {
    expect(clampDescription('  Cirrus clouds are   thin.  ')).toBe('Cirrus clouds are thin.')
  })

  it('ends at the last sentence boundary when one sits late enough', () => {
    const first = 'Anticyclones are regions of high pressure that bring settled, often clear weather to the areas they cover.'
    const second = ' They rotate clockwise in the northern hemisphere and can persist for many days at a time.'
    const result = clampDescription(first + second)
    expect(result).toBe(first)
    expect(result.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH)
  })

  it('falls back to a word boundary and drops a dangling comma', () => {
    const words = Array.from({ length: 40 }, (_, i) => `word${i},`).join(' ')
    const result = clampDescription(words)
    expect(result.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH)
    expect(result.endsWith(',')).toBe(false)
    expect(result.endsWith('word')).toBe(false)
    expect(words.startsWith(result)).toBe(true)
  })

  it('honours a custom budget', () => {
    expect(clampDescription('one two three four five', 9)).toBe('one two')
  })
})

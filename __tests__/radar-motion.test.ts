import { shouldAutoplayRadar } from '@/lib/radar/radar-motion'

describe('shouldAutoplayRadar', () => {
  it.each([
    [true, false, true],
    [true, true, false],
    [false, false, false],
    [false, true, false],
  ])('fullPage=%s reduced=%s returns %s', (fullPage, reduced, expected) => {
    expect(shouldAutoplayRadar(fullPage, reduced)).toBe(expected)
  })
})

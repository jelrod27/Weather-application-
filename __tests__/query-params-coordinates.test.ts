import { parseCoordinates } from '@/lib/api/query-params'

describe('parseCoordinates', () => {
  it('accepts valid coordinates', () => {
    expect(parseCoordinates('37.77', '-122.42')).toEqual({
      ok: true,
      latitude: 37.77,
      longitude: -122.42,
    })
  })

  it('rejects missing values', () => {
    expect(parseCoordinates(null, '-122')).toEqual({
      ok: false,
      error: 'Latitude and longitude are required',
    })
  })

  it('rejects non-finite values', () => {
    expect(parseCoordinates('1e999', '0')).toEqual({
      ok: false,
      error: 'Invalid coordinates',
    })
  })

  it('rejects out-of-range values', () => {
    expect(parseCoordinates('99', '0')).toEqual({
      ok: false,
      error: 'Coordinates out of valid range',
    })
    expect(parseCoordinates('0', '200')).toEqual({
      ok: false,
      error: 'Coordinates out of valid range',
    })
  })
})

import { parseOptionalLatLonQuery } from '@/lib/parse-query-coords'

describe('parseOptionalLatLonQuery', () => {
  it('returns null when either param is null', () => {
    expect(parseOptionalLatLonQuery(null, null)).toBeNull()
    expect(parseOptionalLatLonQuery('1', null)).toBeNull()
    expect(parseOptionalLatLonQuery(null, '1')).toBeNull()
  })

  it('returns null for empty or whitespace-only', () => {
    expect(parseOptionalLatLonQuery('', '')).toBeNull()
    expect(parseOptionalLatLonQuery('  ', '  ')).toBeNull()
    expect(parseOptionalLatLonQuery('40.7', '')).toBeNull()
  })

  it('returns null for non-numeric or out of range', () => {
    expect(parseOptionalLatLonQuery('abc', '-74')).toBeNull()
    expect(parseOptionalLatLonQuery('91', '0')).toBeNull()
    expect(parseOptionalLatLonQuery('0', '181')).toBeNull()
  })

  it('returns coords for valid pairs', () => {
    expect(parseOptionalLatLonQuery('40.7128', '-74.0060')).toEqual({
      lat: 40.7128,
      lon: -74.0060,
    })
  })
})

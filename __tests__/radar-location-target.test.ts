import { parseRadarCoordinateTarget } from '@/lib/radar/radar-location-target'

describe('parseRadarCoordinateTarget', () => {
  it('returns an exact target for a valid lat/lon-only warning link', () => {
    const params = new URLSearchParams('lat=39.8000&lon=-105.0000')

    expect(parseRadarCoordinateTarget(params)).toEqual({
      latitude: 39.8,
      longitude: -105,
      label: '39.8000, -105.0000',
    })
  })

  it.each([
    'lat=&lon=-105',
    'lat=91&lon=-105',
    'lat=39.8&lon=-181',
    'lat=abc&lon=-105',
  ])('rejects invalid coordinate pair %s', (query) => {
    expect(parseRadarCoordinateTarget(new URLSearchParams(query))).toBeNull()
  })
})

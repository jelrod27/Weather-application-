import {
  getRadarHrefForGeometry,
  getWarningDetailHref,
  nwsGeometryBBox,
  warningIdSlug,
} from '@/lib/warnings/alert-links'

describe('alert-links', () => {
  it('uses the NWS id tail so slashes do not break routing', () => {
    expect(warningIdSlug('https://api.weather.gov/alerts/urn:oid:abc')).toBe('urn:oid:abc')
    expect(getWarningDetailHref('https://api.weather.gov/alerts/urn:oid:abc')).toBe(
      '/warnings/urn%3Aoid%3Aabc',
    )
    expect(getWarningDetailHref(null)).toBe('/warnings')
  })

  it('centers radar on the polygon bbox', () => {
    const geometry = {
      type: 'Polygon',
      coordinates: [
        [
          [-105.2, 39.6],
          [-104.8, 39.6],
          [-104.8, 40.0],
          [-105.2, 40.0],
          [-105.2, 39.6],
        ],
      ],
    }
    expect(nwsGeometryBBox(geometry)).toEqual({
      minLat: 39.6,
      minLon: -105.2,
      maxLat: 40.0,
      maxLon: -104.8,
    })
    expect(getRadarHrefForGeometry(geometry)).toBe('/radar?lat=39.8000&lon=-105.0000')
    expect(getRadarHrefForGeometry(null)).toBe('/radar')
  })
})

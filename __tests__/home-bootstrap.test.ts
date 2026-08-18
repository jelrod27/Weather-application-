import { isUsableCityLabel, pickHomeBootstrapSource } from '@/lib/weather/home-bootstrap'

describe('isUsableCityLabel', () => {
  it('accepts a city, state label', () => {
    expect(isUsableCityLabel('Charleston, WV')).toBe(true)
  })

  it('rejects coordinates and the geolocation fallback name', () => {
    expect(isUsableCityLabel('37.66, -121.87')).toBe(false)
    expect(isUsableCityLabel('Current Location')).toBe(false)
    expect(isUsableCityLabel('  ')).toBe(false)
  })
})

describe('pickHomeBootstrapSource', () => {
  it('does not GPS when auto-locate is off', () => {
    expect(
      pickHomeBootstrapSource({
        shouldAutoLocate: false,
        profileDefault: null,
        lastDisplayedCity: 'Charleston, WV',
        cachedDisplayName: 'Pleasanton, CA',
      }),
    ).toEqual({ kind: 'none' })
  })

  it('uses the profile default before a remembered pin', () => {
    expect(
      pickHomeBootstrapSource({
        shouldAutoLocate: true,
        profileDefault: 'Austin, TX',
        lastDisplayedCity: 'Charleston, WV',
        cachedDisplayName: 'Pleasanton, CA',
      }),
    ).toEqual({ kind: 'search', query: 'Austin, TX' })
  })

  it('prefers the last displayed pin over GPS and cache', () => {
    expect(
      pickHomeBootstrapSource({
        shouldAutoLocate: true,
        profileDefault: null,
        lastDisplayedCity: 'Charleston, WV',
        cachedDisplayName: 'Pleasanton, CA',
      }),
    ).toEqual({ kind: 'search', query: 'Charleston, WV' })
  })

  it('falls back to GPS only when no city pin is remembered', () => {
    expect(
      pickHomeBootstrapSource({
        shouldAutoLocate: true,
        profileDefault: null,
        lastDisplayedCity: null,
        cachedDisplayName: 'Current Location',
      }),
    ).toEqual({ kind: 'gps' })
  })
})

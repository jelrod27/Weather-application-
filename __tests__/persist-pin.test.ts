import { LAST_LOCATION_KEY } from '@/lib/weather-session-cache'
import { persistPinLabel, readPersistedPinLabel } from '@/lib/warnings/persist-pin'

describe('persistPinLabel', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores a city pin and rejects coordinates', () => {
    expect(persistPinLabel('37.66, -121.87')).toBe(false)
    expect(readPersistedPinLabel()).toBeNull()

    expect(persistPinLabel('Charleston, WV')).toBe(true)
    expect(localStorage.getItem(LAST_LOCATION_KEY)).toBe('Charleston, WV')
    expect(readPersistedPinLabel()).toBe('Charleston, WV')
  })

  it('rejects the geolocation fallback name', () => {
    expect(persistPinLabel('Current Location')).toBe(false)
    expect(readPersistedPinLabel()).toBeNull()
  })
})

import { LAST_LOCATION_KEY } from '@/lib/weather-session-cache'
import { safeStorage } from '@/lib/safe-storage'
import { userCacheService } from '@/lib/user-cache-service'
import { isUsableCityLabel } from '@/lib/weather/home-bootstrap'

export const PIN_CHANGE_EVENT = 'bitweather-pin-change'

function notifyPinChange(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PIN_CHANGE_EVENT))
}

/** Persist a warning-center / weather pin without waiting on a full forecast fetch. */
export function persistPinLabel(label: string): boolean {
  const trimmed = label.trim()
  if (!isUsableCityLabel(trimmed)) return false
  safeStorage.setItem(LAST_LOCATION_KEY, trimmed)
  const preferences = userCacheService.getPreferences()
  if (preferences) {
    preferences.lastLocation = { displayName: trimmed }
    userCacheService.savePreferences(preferences)
  }
  notifyPinChange()
  return true
}

export function readPersistedPinLabel(): string | null {
  const stored = safeStorage.getItem(LAST_LOCATION_KEY)
  if (!stored || !isUsableCityLabel(stored)) return null
  return stored.trim()
}

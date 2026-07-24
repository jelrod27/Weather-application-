/**
 * Canonical preference helpers.
 *
 * Source of truth for signed-in users: Supabase `user_preferences`
 * (`lib/supabase/types`.UserPreferences). Local storage is an offline mirror
 * only — see `LocalUserCache` in user-cache-service.
 */

import type { UserPreferences } from '@/lib/supabase/types'

export type UnitSystem = 'metric' | 'imperial'

export function unitSystemFromTemperatureUnit(
  unit: UserPreferences['temperature_unit'] | null | undefined,
): UnitSystem {
  return unit === 'celsius' ? 'metric' : 'imperial'
}

export function temperatureUnitFromUnitSystem(
  system: UnitSystem,
): UserPreferences['temperature_unit'] {
  return system === 'metric' ? 'celsius' : 'fahrenheit'
}

/**
 * Resolve auto-locate: server prefs win when present, otherwise local mirror,
 * otherwise default true.
 */
export function resolveAutoLocation(
  serverPrefs: Pick<UserPreferences, 'auto_location'> | null | undefined,
  localAutoLocation: boolean | undefined,
): boolean {
  if (typeof serverPrefs?.auto_location === 'boolean') {
    return serverPrefs.auto_location
  }
  if (typeof localAutoLocation === 'boolean') {
    return localAutoLocation
  }
  return true
}

/**
 * Resolve unit system: server temperature_unit wins when present.
 */
export function resolveUnitSystem(
  serverPrefs: Pick<UserPreferences, 'temperature_unit'> | null | undefined,
  localUnits: UnitSystem | undefined,
): UnitSystem {
  if (serverPrefs?.temperature_unit === 'celsius' || serverPrefs?.temperature_unit === 'fahrenheit') {
    return unitSystemFromTemperatureUnit(serverPrefs.temperature_unit)
  }
  return localUnits === 'metric' || localUnits === 'imperial' ? localUnits : 'imperial'
}

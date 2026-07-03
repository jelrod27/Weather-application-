'use client'

import { useEffect, useMemo, useState } from 'react'
import { Save, Settings, Thermometer, Wind, MapPin, Bell } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'
import { useAuth } from '@/lib/auth'
import { updateProfile } from '@/lib/supabase/database'
import { updateUserPreferencesAPI } from '@/lib/services/preferences-service'
import type { SavedLocation } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type TemperatureUnit = 'fahrenheit' | 'celsius'
type WindUnit = 'mph' | 'kmh' | 'ms'

interface PreferencesPanelProps {
  locations: SavedLocation[]
}

const WIND_UNIT_OPTIONS: Array<{ value: WindUnit; label: string }> = [
  { value: 'mph', label: 'mph' },
  { value: 'kmh', label: 'kph' },
  { value: 'ms', label: 'm/s' },
]

export default function PreferencesPanel({ locations }: PreferencesPanelProps) {
  const { theme } = useTheme()
  const themeClasses = getComponentStyles(theme as ThemeType, 'dashboard')
  const { user, profile, preferences, refreshPreferences, refreshProfile } = useAuth()

  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>('fahrenheit')
  const [windUnit, setWindUnit] = useState<WindUnit>('mph')
  const [defaultLocation, setDefaultLocation] = useState<string>('')
  const [autoLocation, setAutoLocation] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  // Seed from loaded preferences / profile
  useEffect(() => {
    if (preferences) {
      setTemperatureUnit(preferences.temperature_unit)
      setWindUnit(preferences.wind_unit)
      setAutoLocation(preferences.auto_location)
      setNotificationsEnabled(preferences.notifications_enabled)
    }
  }, [preferences])

  useEffect(() => {
    setDefaultLocation(profile?.default_location ?? '')
  }, [profile?.default_location])

  const locationOptions = useMemo(
    () =>
      locations.map((loc) => ({
        value: loc.location_name,
        label: loc.custom_name
          ? `${loc.custom_name} (${loc.location_name})`
          : loc.location_name,
      })),
    [locations],
  )

  const hasLocations = locationOptions.length > 0

  const dirty = useMemo(() => {
    if (!preferences) return false
    if (temperatureUnit !== preferences.temperature_unit) return true
    if (windUnit !== preferences.wind_unit) return true
    if (autoLocation !== preferences.auto_location) return true
    if (notificationsEnabled !== preferences.notifications_enabled) return true
    if ((profile?.default_location ?? '') !== defaultLocation) return true
    return false
  }, [preferences, profile?.default_location, temperatureUnit, windUnit, autoLocation, notificationsEnabled, defaultLocation])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setMessage(null)

    try {
      const prefsResult = await updateUserPreferencesAPI({
        temperature_unit: temperatureUnit,
        wind_unit: windUnit,
        auto_location: autoLocation,
        notifications_enabled: notificationsEnabled,
      })

      if (!prefsResult) {
        setMessageType('error')
        setMessage('Failed to save preferences. Try again in a moment.')
        return
      }

      // Only hit the profile endpoint if the default-location value changed
      if ((profile?.default_location ?? '') !== defaultLocation) {
        const updated = await updateProfile(user.id, {
          default_location: defaultLocation?.trim() || null,
        })
        if (!updated) {
          setMessageType('error')
          setMessage('Preferences saved, but failed to save default location.')
          return
        }
        await refreshProfile()
      }

      await refreshPreferences()
      setMessageType('success')
      setMessage('Preferences saved.')
    } catch (error) {
      console.error('[preferences-panel] save failed', error)
      setMessageType('error')
      setMessage('Something went wrong while saving.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      className={`${themeClasses.background} border-2 ${themeClasses.borderColor}`}
      data-testid="preferences-panel"
    >
      <CardHeader>
        <CardTitle
          className={`font-mono font-bold text-lg uppercase tracking-wider ${themeClasses.text}`}
        >
          <Settings className="w-5 h-5 inline mr-2" aria-hidden="true" />
          Preferences
        </CardTitle>
        <CardDescription className={`font-mono ${themeClasses.mutedText}`}>
          Units, default location, and startup behavior persist across sessions.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Temperature Unit */}
        <div className="space-y-3">
          <Label
            className={`flex items-center gap-2 font-mono uppercase tracking-wider ${themeClasses.text}`}
          >
            <Thermometer className="w-4 h-4" aria-hidden="true" />
            Temperature Unit
          </Label>
          <div
            role="radiogroup"
            aria-label="Temperature unit"
            className="inline-flex rounded-md overflow-hidden border-2 border-[var(--weather-border)]"
          >
            {(['fahrenheit', 'celsius'] as TemperatureUnit[]).map((unit) => {
              const selected = temperatureUnit === unit
              return (
                <button
                  key={unit}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTemperatureUnit(unit)}
                  className={cn(
                    'px-4 py-2 font-mono text-sm uppercase tracking-wider transition-colors',
                    selected
                      ? `${themeClasses.accentBg} text-black`
                      : `${themeClasses.text} hover:bg-white/10`,
                  )}
                >
                  {unit === 'fahrenheit' ? '°F' : '°C'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Wind Unit */}
        <div className="space-y-3">
          <Label
            htmlFor="wind-unit"
            className={`flex items-center gap-2 font-mono uppercase tracking-wider ${themeClasses.text}`}
          >
            <Wind className="w-4 h-4" aria-hidden="true" />
            Wind Unit
          </Label>
          <select
            id="wind-unit"
            value={windUnit}
            onChange={(event) => setWindUnit(event.target.value as WindUnit)}
            className={cn(
              'w-full max-w-xs rounded-md border-2 px-3 py-2 font-mono text-sm',
              'bg-black/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]',
              themeClasses.borderColor,
              themeClasses.text,
            )}
          >
            {WIND_UNIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Auto-detect Location */}
        <div className="flex items-center justify-between p-4 border-2 rounded-lg bg-black/20 border-[var(--weather-border)]">
          <div className="space-y-0.5">
            <Label className={`flex items-center gap-2 font-mono uppercase tracking-wider ${themeClasses.text}`}>
              <MapPin className="w-4 h-4" aria-hidden="true" />
              Auto-Detect Location
            </Label>
            <p className={`text-xs font-mono ${themeClasses.mutedText}`}>
              Use your current location when you open the app
            </p>
          </div>
          <Switch
            checked={autoLocation}
            onCheckedChange={setAutoLocation}
            aria-label="Auto-detect location on startup"
          />
        </div>

        {/* Notifications (UI only until Condition Watch ships) */}
        <div className="flex items-center justify-between p-4 border-2 rounded-lg bg-black/20 border-[var(--weather-border)]">
          <div className="space-y-0.5">
            <Label className={`flex items-center gap-2 font-mono uppercase tracking-wider ${themeClasses.text}`}>
              <Bell className="w-4 h-4" aria-hidden="true" />
              Weather Notifications
            </Label>
            <p className={`text-xs font-mono ${themeClasses.mutedText}`}>
              Email + in-app alerts for NWS warnings at your saved locations
            </p>
          </div>
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={setNotificationsEnabled}
            aria-label="Enable weather notifications"
            data-testid="notifications-enabled-toggle"
          />
        </div>

        {/* Default Location */}
        <div className="space-y-3">
          <Label
            htmlFor="default-location"
            className={`flex items-center gap-2 font-mono uppercase tracking-wider ${themeClasses.text}`}
          >
            Default Location
          </Label>
          {hasLocations ? (
            <select
              id="default-location"
              value={defaultLocation}
              onChange={(event) => setDefaultLocation(event.target.value)}
              className={cn(
                'w-full max-w-md rounded-md border-2 px-3 py-2 font-mono text-sm',
                'bg-black/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]',
                themeClasses.borderColor,
                themeClasses.text,
              )}
            >
              <option value="">-- No default --</option>
              {locationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <p
              className={`text-sm font-mono ${themeClasses.mutedText}`}
              data-testid="default-location-empty-hint"
            >
              Save a location first to pick a default.
            </p>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center gap-4 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            aria-label="Save preferences"
            className={`font-mono font-bold uppercase tracking-wider ${themeClasses.accentBg} text-black hover:opacity-90 disabled:opacity-50`}
          >
            <Save className="w-4 h-4 mr-2" aria-hidden="true" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
          {message && (
            <p
              role="status"
              className={cn(
                'text-sm font-mono',
                messageType === 'success'
                  ? 'text-green-400'
                  : 'text-red-400',
              )}
            >
              {message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

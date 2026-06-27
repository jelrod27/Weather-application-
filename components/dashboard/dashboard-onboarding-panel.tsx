'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, MapPin, Navigation, Plus, Settings, Sparkles, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'
import { LocationService } from '@/lib/location-service'
import { dismissOnboarding } from '@/lib/dashboard/onboarding-state'
import { saveUserLocation } from '@/lib/dashboard/save-user-location'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { captureAnalyticsEvent } from '@/lib/analytics/posthog'

interface DashboardOnboardingPanelProps {
  userId: string
  displayName: string
  onAddLocation: () => void
  onLocationSaved: () => void
  onDismiss: () => void
}

export default function DashboardOnboardingPanel({
  userId,
  displayName,
  onAddLocation,
  onLocationSaved,
  onDismiss,
}: DashboardOnboardingPanelProps) {
  const { theme } = useTheme()
  const themeClasses = getComponentStyles(theme as ThemeType, 'dashboard')
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const handleDismiss = () => {
    captureAnalyticsEvent(AnalyticsEvents.ONBOARDING_DISMISSED)
    dismissOnboarding(userId)
    onDismiss()
  }

  const handleUseMyLocation = async () => {
    setGeoLoading(true)
    setGeoError(null)

    try {
      const locationService = LocationService.getInstance()
      const location = await locationService.getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        useCache: false,
      })

      const stateOrRegion = location.region || null
      const locationName = stateOrRegion
        ? `${location.city || location.displayName}, ${stateOrRegion}`
        : location.displayName

      await saveUserLocation({
        location_name: locationName,
        city: location.city || location.displayName.split(',')[0]?.trim() || location.displayName,
        state: stateOrRegion,
        country: location.country || 'Unknown',
        latitude: location.latitude,
        longitude: location.longitude,
        is_favorite: true,
      })

      captureAnalyticsEvent(AnalyticsEvents.FIRST_LOCATION_SAVED, { source: 'geolocation' })
      dismissOnboarding(userId)
      onDismiss()
      onLocationSaved()
    } catch (error) {
      console.error('[dashboard-onboarding] geolocation save failed', error)
      setGeoError(
        error instanceof Error
          ? error.message
          : 'Could not detect your location. Try Add Location instead.',
      )
    } finally {
      setGeoLoading(false)
    }
  }

  return (
    <Card
      className={`${themeClasses.background} border-2 ${themeClasses.borderColor} ${themeClasses.glow}`}
      data-testid="dashboard-onboarding-panel"
    >
      <CardHeader className="relative pb-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          aria-label="Dismiss onboarding"
          className={`absolute right-2 top-2 ${themeClasses.text} hover:bg-white/10`}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>
        <CardTitle
          className={`font-mono font-bold text-xl uppercase tracking-wider ${themeClasses.text} pr-10`}
        >
          <Sparkles className="w-5 h-5 inline mr-2" aria-hidden="true" />
          Welcome{displayName ? `, ${displayName}` : ''}!
        </CardTitle>
        <CardDescription className={`font-mono ${themeClasses.mutedText} max-w-2xl`}>
          Your account is ready. Add a city to unlock saved weather cards, a default location, and
          personalized units on this dashboard.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <ol className="space-y-3 font-mono text-sm" aria-label="Getting started steps">
          <li className={`flex items-start gap-3 ${themeClasses.text}`}>
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong className="uppercase tracking-wider">Step 1:</strong> Save your first location
            </span>
          </li>
          <li className={`flex items-start gap-3 ${themeClasses.text}`}>
            <Settings className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong className="uppercase tracking-wider">Step 2:</strong> Set units and default
              city in Preferences below
            </span>
          </li>
          <li className={`flex items-start gap-3 ${themeClasses.text}`}>
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong className="uppercase tracking-wider">Step 3:</strong> Optional —{' '}
              <Link href="/profile" className={`font-bold hover:underline ${themeClasses.accentText}`}>
                add a username
              </Link>{' '}
              on your profile
            </span>
          </li>
        </ol>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={onAddLocation}
            className={`font-mono font-bold uppercase tracking-wider ${themeClasses.accentBg} text-black hover:opacity-90`}
          >
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Add Location
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={geoLoading}
            onClick={handleUseMyLocation}
            className={`font-mono font-bold uppercase tracking-wider ${themeClasses.borderColor} ${themeClasses.text} hover:bg-white/10`}
          >
            <Navigation className={`w-4 h-4 mr-2 ${geoLoading ? 'animate-pulse' : ''}`} aria-hidden="true" />
            {geoLoading ? 'Detecting...' : 'Use My Location'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleDismiss}
            className={`font-mono text-sm ${themeClasses.mutedText} hover:bg-white/5`}
          >
            Skip for now
          </Button>
        </div>

        {geoError && (
          <p role="alert" className="text-sm font-mono text-red-400">
            {geoError}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

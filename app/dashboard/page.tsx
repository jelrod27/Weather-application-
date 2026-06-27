'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProtectedRoute, useAuth } from '@/lib/auth'
import { useSavedLocations } from '@/lib/supabase/hooks'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'
import { Settings } from 'lucide-react'
import Navigation from '@/components/navigation'
import AddLocationModal from '@/components/dashboard/add-location-modal'
import ThemeSelectorGrid from '@/components/dashboard/theme-selector-grid'
import SavedLocationsPanel from '@/components/dashboard/saved-locations-panel'
import PreferencesPanel from '@/components/dashboard/preferences-panel'
import DashboardOnboardingPanel from '@/components/dashboard/dashboard-onboarding-panel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isOnboardingDismissed } from '@/lib/dashboard/onboarding-state'

const WELCOME_MODAL_KEY = 'dashboard-welcome-modal-opened'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const { user, profile } = useAuth()
  const { locations, loading, refetch } = useSavedLocations()
  const { theme } = useTheme()
  const themeClasses = getComponentStyles(theme as ThemeType, 'dashboard')
  const searchParams = useSearchParams()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const displayName = profile?.username || profile?.full_name || 'User'
  const hasLocations = locations.length > 0

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!user || loading) return

    void fetch('/api/auth/welcome-email', { method: 'POST' }).catch((error) => {
      console.error('[dashboard] welcome email request failed', error)
    })
  }, [user, loading])

  useEffect(() => {
    if (!user || loading) return
    if (hasLocations) {
      setShowOnboarding(false)
      return
    }
    setShowOnboarding(!isOnboardingDismissed(user.id))
  }, [user, loading, hasLocations])

  useEffect(() => {
    if (!mounted || loading || hasLocations) return
    if (searchParams.get('welcome') !== '1') return
    if (typeof window === 'undefined') return
    if (window.sessionStorage.getItem(WELCOME_MODAL_KEY) === '1') return

    window.sessionStorage.setItem(WELCOME_MODAL_KEY, '1')
    setIsAddModalOpen(true)
  }, [mounted, loading, hasLocations, searchParams])

  const handleLocationUpdate = useCallback(() => {
    refetch()
  }, [refetch])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      <Navigation />

      <div className="container mx-auto px-4 py-8 space-y-8">
        <header className="text-center">
          <h1
            className={`text-3xl font-bold uppercase tracking-wider font-mono mb-3 ${themeClasses.text} ${themeClasses.glow}`}
            style={{
              fontFamily: 'monospace',
              fontSize: 'clamp(24px, 5vw, 40px)',
            }}
          >
            Weather Dashboard
          </h1>
          <p
            className={`text-base font-mono ${themeClasses.secondary || themeClasses.text} max-w-2xl mx-auto`}
          >
            {hasLocations ? (
              <>
                Welcome back, {displayName}! You have {locations.length} saved location
                {locations.length === 1 ? '' : 's'}.
              </>
            ) : (
              <>Welcome, {displayName}! Add your first location to get started.</>
            )}
          </p>
        </header>

        {showOnboarding && user && (
          <DashboardOnboardingPanel
            userId={user.id}
            displayName={profile?.username || profile?.full_name || ''}
            onAddLocation={() => setIsAddModalOpen(true)}
            onLocationSaved={handleLocationUpdate}
            onDismiss={() => setShowOnboarding(false)}
          />
        )}

        <SavedLocationsPanel
          locations={locations}
          loading={loading}
          onUpdate={handleLocationUpdate}
          onAddLocation={() => setIsAddModalOpen(true)}
        />

        <PreferencesPanel locations={locations} />

        <Card
          className={`${themeClasses.background} border-2 ${themeClasses.borderColor}`}
          data-testid="theme-panel"
        >
          <CardHeader>
            <CardTitle
              className={`font-mono font-bold text-lg uppercase tracking-wider ${themeClasses.text}`}
            >
              <Settings className="w-5 h-5 inline mr-2" aria-hidden="true" />
              Theme
            </CardTitle>
            <CardDescription className={`font-mono ${themeClasses.mutedText}`}>
              Pick the look and feel for the terminal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSelectorGrid />
          </CardContent>
        </Card>
      </div>

      <AddLocationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onLocationAdded={handleLocationUpdate}
      />
    </div>
  )
}

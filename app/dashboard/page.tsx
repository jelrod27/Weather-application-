'use client'

import { useState, useEffect } from 'react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const { profile } = useAuth()
  const { locations, loading, refetch } = useSavedLocations()
  const { theme } = useTheme()
  const themeClasses = getComponentStyles(theme as ThemeType, 'dashboard')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLocationUpdate = () => {
    refetch()
  }

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
        {/* Welcome Header */}
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
            Welcome back, {profile?.username || profile?.full_name || 'User'}!
            {locations.length > 0 &&
              ` You have ${locations.length} saved location${locations.length === 1 ? '' : 's'}.`}
          </p>
        </header>

        {/* Saved Locations */}
        <SavedLocationsPanel
          locations={locations}
          loading={loading}
          onUpdate={handleLocationUpdate}
          onAddLocation={() => setIsAddModalOpen(true)}
        />

        {/* Preferences (units, default location, auto-location) */}
        <PreferencesPanel locations={locations} />

        {/* Theme */}
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

      {/* Add Location Modal */}
      <AddLocationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onLocationAdded={handleLocationUpdate}
      />
    </div>
  )
}

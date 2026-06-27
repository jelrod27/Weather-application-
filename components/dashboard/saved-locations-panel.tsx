'use client'

import Link from 'next/link'
import { MapPin, Star, Plus, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'
import type { SavedLocation } from '@/lib/supabase/types'
import LocationCard from '@/components/dashboard/location-card'

interface SavedLocationsPanelProps {
  locations: SavedLocation[]
  loading: boolean
  onUpdate: () => void
  onAddLocation: () => void
}

export default function SavedLocationsPanel({
  locations,
  loading,
  onUpdate,
  onAddLocation,
}: SavedLocationsPanelProps) {
  const { theme } = useTheme()
  const themeClasses = getComponentStyles(theme as ThemeType, 'dashboard')

  const favoriteLocations = locations.filter((loc) => loc.is_favorite)
  const otherLocations = locations.filter((loc) => !loc.is_favorite)

  return (
    <Card
      className={`${themeClasses.background} border-2 ${themeClasses.borderColor}`}
      data-testid="saved-locations-panel"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle
              className={`font-mono font-bold text-lg uppercase tracking-wider ${themeClasses.text}`}
            >
              <MapPin className="w-5 h-5 inline mr-2" aria-hidden="true" />
              Saved Locations
            </CardTitle>
            <CardDescription className={`font-mono mt-1 ${themeClasses.mutedText}`}>
              {locations.length === 0
                ? 'No locations saved yet.'
                : `${locations.length} saved location${locations.length === 1 ? '' : 's'}.`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onUpdate}
              disabled={loading}
              aria-label="Refresh saved locations"
              className={`${themeClasses.borderColor} ${themeClasses.text} hover:bg-white/10`}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            </Button>
            <Button
              onClick={onAddLocation}
              className={`font-mono font-bold uppercase tracking-wider ${themeClasses.accentBg} text-black hover:opacity-90 transition-all active:scale-95`}
            >
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {locations.length === 0 ? (
          <div
            className={`text-center py-12 p-8 border-2 border-dashed ${themeClasses.borderColor} rounded-lg bg-black/20`}
            data-testid="saved-locations-empty"
          >
            <MapPin
              className={`w-12 h-12 mx-auto mb-4 ${themeClasses.text} opacity-50`}
              aria-hidden="true"
            />
            <h3
              className={`text-lg font-bold uppercase tracking-wider font-mono mb-2 ${themeClasses.text}`}
            >
              No Saved Locations
            </h3>
            <p
              className={`text-sm font-mono mb-6 ${themeClasses.text} opacity-75 max-w-sm mx-auto`}
            >
              Add your first location to unlock quick weather cards and pick a default city.
              Search from the home page and tap save, or add one directly below.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button
                onClick={onAddLocation}
                className={`font-mono font-bold uppercase tracking-wider ${themeClasses.accentBg} text-black`}
              >
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                Add Location
              </Button>
              <Button
                asChild
                variant="outline"
                className={`font-mono font-bold uppercase tracking-wider ${themeClasses.borderColor} ${themeClasses.text} hover:bg-white/5`}
              >
                <Link href="/">
                  Go to Search
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8" data-testid="saved-locations-list">
            {favoriteLocations.length > 0 && (
              <section aria-labelledby="favorite-locations-heading" className="space-y-4">
                <div
                  className={`flex items-center gap-2 pb-2 border-b-2 ${themeClasses.borderColor}`}
                >
                  <Star className={`w-5 h-5 ${themeClasses.text}`} aria-hidden="true" />
                  <h3
                    id="favorite-locations-heading"
                    className={`text-base font-bold uppercase tracking-wider font-mono ${themeClasses.text}`}
                  >
                    Favorites ({favoriteLocations.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {favoriteLocations.map((location) => (
                    <LocationCard
                      key={location.id}
                      location={location}
                      onUpdate={onUpdate}
                    />
                  ))}
                </div>
              </section>
            )}
            {otherLocations.length > 0 && (
              <section aria-labelledby="other-locations-heading" className="space-y-4">
                <div
                  className={`flex items-center gap-2 pb-2 border-b-2 ${themeClasses.borderColor}`}
                >
                  <MapPin className={`w-5 h-5 ${themeClasses.text}`} aria-hidden="true" />
                  <h3
                    id="other-locations-heading"
                    className={`text-base font-bold uppercase tracking-wider font-mono ${themeClasses.text}`}
                  >
                    {favoriteLocations.length > 0 ? 'Other Locations' : 'All Locations'} (
                    {otherLocations.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {otherLocations.map((location) => (
                    <LocationCard
                      key={location.id}
                      location={location}
                      onUpdate={onUpdate}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

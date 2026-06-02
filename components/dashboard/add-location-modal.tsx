'use client'

import { useState } from 'react'
import { X, MapPin, Search, Plus, Star } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AddLocationModalProps {
  isOpen: boolean
  onClose: () => void
  onLocationAdded: () => void
}

export default function AddLocationModal({ isOpen, onClose, onLocationAdded }: AddLocationModalProps) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const themeClasses = getComponentStyles(theme as ThemeType, 'modal')

  const [searchTerm, setSearchTerm] = useState('')
  const [customName, setCustomName] = useState('')
  const [notes, setNotes] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !searchTerm.trim()) return

    setLoading(true)
    setError('')

    try {
      // Use internal geocoding API with timeout
      const geocodeUrl = `/api/weather/geocoding?q=${encodeURIComponent(searchTerm.trim())}&limit=1`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(geocodeUrl, {
        signal: controller.signal
      }).catch(err => {
        if (err.name === 'AbortError') {
          throw new Error('Geocoding request timed out. Please try again.')
        }
        throw err
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to geocode location')
      }

      const locationData = await response.json()

      if (!locationData || locationData.length === 0) {
        setError('Location not found. Please try a different search term.')
        return
      }

      const location = locationData[0]

      // Save to database via API
      const saveData = {
        user_id: user.id,
        location_name: `${location.name}, ${location.state || location.country}`,
        city: location.name,
        state: location.state || null,
        country: location.country,
        latitude: location.lat,
        longitude: location.lon,
        is_favorite: isFavorite,
        custom_name: customName.trim() || null,
        notes: notes.trim() || null
      }

      const { supabase } = await import('@/lib/supabase/client')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error('You must be logged in to save locations')
      }

      const saveController = new AbortController()
      const saveTimeoutId = setTimeout(() => saveController.abort(), 15000)

      const saveResponse = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(saveData),
        signal: saveController.signal
      }).catch(err => {
        if (err.name === 'AbortError') {
          throw new Error('Save request timed out. Please check your connection and try again.')
        }
        throw err
      })

      clearTimeout(saveTimeoutId)

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json()

        if (saveResponse.status === 409 && errorData.existing) {
          throw new Error('This location is already in your saved locations.')
        }

        throw new Error(errorData.error || 'Failed to save location')
      }

      const savedLocation = await saveResponse.json()

      if (savedLocation) {
        onLocationAdded()
        handleClose()
      } else {
        setError('Failed to save location. It may already be saved.')
      }
    } catch (error) {
      console.error('Error adding location:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save location. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSearchTerm('')
    setCustomName('')
    setNotes('')
    setIsFavorite(false)
    setError('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className={`sm:max-w-md container-primary ${themeClasses.background} p-0 overflow-hidden`}>
        <DialogHeader className={`p-6 pb-2`}>
          <DialogTitle className={`text-xl font-bold uppercase tracking-wider font-mono ${themeClasses.text}`}>
            Add Location
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-2">
          {/* Error Message */}
          {error && (
            <div className="p-3 mb-4 border-0 bg-red-100 text-red-700 text-sm font-mono">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Location Search */}
            <div className="space-y-2">
              <Label className={`text-sm font-mono font-bold uppercase ${themeClasses.text}`}>
                Location *
              </Label>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${themeClasses.mutedText}`} />
                <Input
                  type="text"
                  required
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 font-mono bg-transparent ${themeClasses.borderColor} ${themeClasses.text}`}
                  placeholder="City, State or ZIP code"
                />
              </div>
              <p className={`text-xs font-mono ${themeClasses.mutedText}`}>
                Examples: San Francisco, CA | 90210 | London, UK
              </p>
            </div>

            {/* Custom Name */}
            <div className="space-y-2">
              <Label className={`text-sm font-mono font-bold uppercase ${themeClasses.text}`}>
                Custom Name (Optional)
              </Label>
              <div className="relative">
                <MapPin className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${themeClasses.mutedText}`} />
                <Input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className={`pl-10 font-mono bg-transparent ${themeClasses.borderColor} ${themeClasses.text}`}
                  placeholder="My hometown, Work location..."
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className={`text-sm font-mono font-bold uppercase ${themeClasses.text}`}>
                Notes (Optional)
              </Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={`flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono ${themeClasses.borderColor} ${themeClasses.text}`}
                placeholder="Add any notes about this location..."
              />
            </div>

            {/* Favorite Checkbox */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                className={`w-5 h-5 border-0 flex items-center justify-center transition-all duration-200 ${isFavorite
                    ? `${themeClasses.accentBg}`
                    : `${themeClasses.background} bg-white/10`
                  }`}
              >
                {isFavorite && <Star className="w-3 h-3 text-black fill-current" />}
              </button>
              <Label className={`text-sm font-mono font-bold uppercase ${themeClasses.text} cursor-pointer`} onClick={() => setIsFavorite(!isFavorite)}>
                Add to Favorites
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !searchTerm.trim()}
              className={`w-full font-mono font-bold uppercase tracking-wider ${themeClasses.accentBg} text-black mt-4`}
            >
              {loading ? (
                <span>Adding...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </>
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
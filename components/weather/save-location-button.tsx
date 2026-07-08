'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { BookmarkPlus, Check, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { saveUserLocation } from '@/lib/dashboard/save-user-location'
import AuthGateModal from '@/components/auth/auth-gate-modal'
import { Button } from '@/components/ui/button'
import type { WeatherData } from '@/lib/types'

interface SaveLocationButtonProps {
  weather: WeatherData
  cityName: string
  state?: string
}

/**
 * "Save to Dashboard" on public weather pages. Logged-out visitors get the
 * auth gate modal and return here after signing in (?next=); logged-in
 * users save directly.
 */
export default function SaveLocationButton({ weather, cityName, state }: SaveLocationButtonProps) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [gateOpen, setGateOpen] = useState(false)

  const latitude = weather.coordinates?.lat
  const longitude = weather.coordinates?.lon

  if (latitude == null || longitude == null) {
    return null
  }

  const handleClick = async () => {
    if (!user) {
      setGateOpen(true)
      return
    }

    setStatus('saving')
    setMessage('')

    try {
      await saveUserLocation({
        location_name: weather.location || cityName,
        city: cityName,
        state: state || null,
        country: weather.country || 'Unknown',
        latitude,
        longitude,
      })
      setStatus('saved')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save location'
      if (errorMessage.includes('already in your saved locations')) {
        setStatus('saved')
        setMessage('Already saved to your dashboard')
      } else {
        setStatus('error')
        setMessage(errorMessage)
      }
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleClick}
        disabled={status === 'saving' || status === 'saved'}
        variant="outline"
        size="sm"
        className="font-mono font-bold uppercase tracking-wider border-2"
        data-testid="save-location-button"
      >
        {status === 'saving' ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : status === 'saved' ? (
          <Check className="w-4 h-4 mr-2" />
        ) : (
          <BookmarkPlus className="w-4 h-4 mr-2" />
        )}
        {status === 'saved' ? 'Saved' : 'Save to Dashboard'}
      </Button>
      {message && (
        <span
          className={`text-xs font-mono ${status === 'error' ? 'text-red-500' : 'text-muted-foreground'}`}
          data-testid="save-location-message"
        >
          {message}
        </span>
      )}

      <AuthGateModal
        open={gateOpen}
        onOpenChange={setGateOpen}
        title="Save this location"
        description="Sign in to pin this city to your dashboard and get severe weather alerts for it."
        next={pathname ?? undefined}
      />
    </div>
  )
}

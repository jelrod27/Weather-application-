'use client'

import { useEffect, useState } from 'react'
// Single source of truth for auth state. This module previously had its own
// getSession()-based useAuth, which could diverge from the app-wide
// AuthProvider — everything now reads the shared context.
import { useAuth } from '@/lib/auth/auth-context'
import type { SavedLocation } from './types'
import { getSavedLocations } from './database'

// Hook to get saved locations
export const useSavedLocations = () => {
  const { user, loading: authLoading } = useAuth()
  const [locations, setLocations] = useState<SavedLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLocations = async () => {
      if (!user) {
        setLocations([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const locationsData = await getSavedLocations(user.id)
        setLocations(locationsData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch saved locations')
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchLocations()
    }
  }, [user, authLoading])

  return {
    locations,
    loading: loading || authLoading,
    error,
    refetch: () => {
      if (user) {
        const fetchLocations = async () => {
          const locationsData = await getSavedLocations(user.id)
          setLocations(locationsData)
        }
        fetchLocations()
      }
    }
  }
}

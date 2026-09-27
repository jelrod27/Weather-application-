'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { getSavedLocations } from './database'
import type { SavedLocation } from './types'

export const useSavedLocations = (): {
  locations: SavedLocation[]; loading: boolean; error: string | null; refetch: () => Promise<void>
} => {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? ''
  const requestId = useRef(0)
  const [state, setState] = useState<{ userId: string; locations: SavedLocation[]; loading: boolean; error: string | null }>({ userId: '', locations: [], loading: true, error: null })
  const refetch = useCallback(async () => {
    const id = ++requestId.current
    if (authLoading) return
    setState(previous => ({ userId, locations: previous.userId === userId ? previous.locations : [], loading: true, error: null }))
    try {
      const locations = userId ? await getSavedLocations(userId) : []
      if (id === requestId.current) setState({ userId, locations, loading: false, error: null })
    } catch {
      if (id === requestId.current) setState(previous => ({ ...previous, loading: false, error: 'Saved locations are temporarily unavailable.' }))
    }
  }, [userId, authLoading])
  useEffect(() => {
    void refetch()
    return () => { requestId.current++ }
  }, [refetch])
  return {
    locations: state.userId === userId && !authLoading ? state.locations : [],
    loading: authLoading || state.userId !== userId || state.loading,
    error: state.userId === userId ? state.error : null,
    refetch,
  }
}

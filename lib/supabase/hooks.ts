'use client'

import { useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from './client'
import type { Profile, SavedLocation, UserPreferences } from './types'
import { getProfile, getSavedLocations, getUserPreferences } from './database'

// Hook to get current user and session
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user
  }
}

// Hook to get user profile
const useProfile = () => {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const profileData = await getProfile(user.id)
        setProfile(profileData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profile')
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchProfile()
    }
  }, [user, authLoading])

  return {
    profile,
    loading: loading || authLoading,
    error,
    refetch: () => {
      if (user) {
        const fetchProfile = async () => {
          const profileData = await getProfile(user.id)
          setProfile(profileData)
        }
        fetchProfile()
      }
    }
  }
}

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

// Hook to get user preferences
const useUserPreferences = () => {
  const { user, loading: authLoading } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) {
        setPreferences(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const preferencesData = await getUserPreferences(user.id)
        setPreferences(preferencesData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user preferences')
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchPreferences()
    }
  }, [user, authLoading])

  return {
    preferences,
    loading: loading || authLoading,
    error,
    refetch: () => {
      if (user) {
        const fetchPreferences = async () => {
          const preferencesData = await getUserPreferences(user.id)
          setPreferences(preferencesData)
        }
        fetchPreferences()
      }
    }
  }
}
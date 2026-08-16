'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'
import { PLACEHOLDER_URL, PLACEHOLDER_ANON_KEY, warnIfPlaceholder } from './constants'
import { supabaseTimedFetch } from './timed-fetch'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_ANON_KEY

// Warn developers when using placeholder credentials
warnIfPlaceholder(supabaseUrl, supabaseAnonKey, 'createBrowserClient')

export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    global: { fetch: supabaseTimedFetch },
  },
)

const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting current user:', error)
    return null
  }
  return user
}

const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error getting session:', error)
    return null
  }
  return session
}

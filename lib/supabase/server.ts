import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'
import { PLACEHOLDER_URL, PLACEHOLDER_ANON_KEY, warnIfPlaceholder } from './constants'

// Create a server-side supabase client
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_ANON_KEY
  
  // Warn developers when using placeholder credentials
  warnIfPlaceholder(supabaseUrl, supabaseKey, 'createServerSupabaseClient')

  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}

// Helper function to get user on server
export const getServerUser = async () => {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    // "Auth session missing" is the normal state for anonymous visitors —
    // logging it as an error floods Vercel/Sentry (it was the top runtime
    // error cluster in production). Only log unexpected auth failures.
    if (error.name !== 'AuthSessionMissingError') {
      console.error('[supabase] Error getting server user:', error)
    }
    return null
  }

  return user
}

// Helper function to get session on server
const getServerSession = async () => {
  const supabase = await createServerSupabaseClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Error getting server session:', error)
    return null
  }

  return session
}
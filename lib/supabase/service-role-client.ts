import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { PLACEHOLDER_SERVICE_KEY, PLACEHOLDER_URL } from '@/lib/supabase/constants'

export function createServiceRoleSupabaseClient(): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    supabaseUrl === PLACEHOLDER_URL ||
    serviceRoleKey === PLACEHOLDER_SERVICE_KEY
  ) {
    return null
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

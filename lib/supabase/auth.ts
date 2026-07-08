'use client'

import { supabase } from './client'
import type { AuthError, User } from '@supabase/supabase-js'

export interface AuthResponse {
  user: User | null
  error: AuthError | null
}

export interface SignUpData {
  email: string
  password: string
  username?: string
  full_name?: string
  captchaToken?: string
}

export interface SignInData {
  email: string
  password: string
  captchaToken?: string
}

// Sign up new user
export const signUp = async ({ email, password, username, full_name, captchaToken }: SignUpData): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        full_name,
      },
      captchaToken,
    }
  })

  return {
    user: data.user,
    error
  }
}

// Sign in existing user
export const signIn = async ({ email, password, captchaToken }: SignInData): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: {
      captchaToken,
    }
  })

  return {
    user: data.user,
    error
  }
}

// Sign in with OAuth providers
export const signInWithProvider = async (
  provider: 'google' | 'github' | 'discord',
  options?: { redirectTo?: string }
) => {
  // Build callback URL with optional next parameter
  const callbackUrl = new URL(`${window.location.origin}/auth/callback`)

  // Default to dashboard for better UX (users expect to see their account after login)
  // Can be overridden by passing redirectTo option
  const finalDestination = options?.redirectTo || '/dashboard?welcome=1'
  callbackUrl.searchParams.set('next', finalDestination)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl.toString(),
      // Skip confirmation for better UX
      skipBrowserRedirect: false,
    }
  })

  return { data, error }
}


// Reset password (used by app/auth/reset-password/page.tsx)
// The recovery link goes through /auth/callback (PKCE code exchange) and then
// lands on /auth/update-password, where the user actually sets the new password.
export const resetPassword = async (email: string, captchaToken?: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/auth/update-password')}`,
    captchaToken,
  })

  return { data, error }
}

// Complete the password-recovery flow (used by app/auth/update-password/page.tsx).
// Requires an active session, which the recovery-link callback establishes.
export const updatePassword = async (password: string) => {
  const { data, error } = await supabase.auth.updateUser({ password })

  return { user: data.user, error }
}

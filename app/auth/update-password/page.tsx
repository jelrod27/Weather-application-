'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { updatePassword } from '@/lib/supabase/auth'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'

const MIN_PASSWORD_LENGTH = 10

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  // null = checking, true = recovery session present, false = no session
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const router = useRouter()
  const { theme } = useTheme()

  const themeClasses = getComponentStyles(theme as ThemeType, 'auth')

  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!cancelled) {
        setHasSession(!!session)
      }
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error } = await updatePassword(password)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Password updated. Redirecting to your dashboard...')
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 1500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className={`w-full max-w-md p-8 border-4 ${themeClasses.background} ${themeClasses.borderColor} ${themeClasses.glow}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-12 h-12 border-2 flex items-center justify-center mx-auto mb-4 ${themeClasses.accentBg} ${themeClasses.borderColor}`}>
            <span className="text-black font-bold text-lg">16</span>
          </div>
          <h1 className={`text-2xl font-bold uppercase tracking-wider font-mono mb-2 ${themeClasses.text}`}>
            Set New Password
          </h1>
          <p className={`text-sm ${themeClasses.secondary || themeClasses.text}`}>
            Choose a new password for your account
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 mb-4 border-2 border-red-500 bg-red-100 text-red-700 text-sm font-mono" data-testid="update-password-error">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 mb-4 border-2 border-green-500 bg-green-100 text-green-700 text-sm font-mono" data-testid="update-password-success">
            {message}
          </div>
        )}

        {hasSession === false ? (
          <div className="space-y-6 text-center">
            <p className={`text-sm font-mono ${themeClasses.text}`}>
              This password reset link is invalid or has expired. Request a new
              one to continue.
            </p>
            <Link
              href="/auth/reset-password"
              className={`inline-block w-full px-4 py-3 border-2 text-sm font-mono font-bold uppercase tracking-wider ${themeClasses.accentBg} ${themeClasses.borderColor} text-black ${themeClasses.glow}`}
            >
              Request New Link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-mono font-bold uppercase mb-2 ${themeClasses.text}`}>
                New Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${themeClasses.mutedText}`} />
                <input
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border-2 text-sm font-mono bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.background} ${themeClasses.borderColor} ${themeClasses.text} focus:ring-current`}
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  data-testid="update-password-input"
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-mono font-bold uppercase mb-2 ${themeClasses.text}`}>
                Confirm Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${themeClasses.mutedText}`} />
                <input
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border-2 text-sm font-mono bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.background} ${themeClasses.borderColor} ${themeClasses.text} focus:ring-current`}
                  placeholder="Re-enter your new password"
                  data-testid="update-password-confirm-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || hasSession === null}
              className={`w-full px-4 py-3 border-2 text-sm font-mono font-bold uppercase tracking-wider transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.accentBg} ${themeClasses.borderColor} text-black ${themeClasses.glow}`}
              data-testid="update-password-submit"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link
            href="/auth/login"
            className={`inline-flex items-center space-x-2 text-sm font-mono hover:underline ${themeClasses.accentText}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

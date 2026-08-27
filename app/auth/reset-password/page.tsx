'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { resetPassword } from '@/lib/supabase/auth'
import { themeTokens } from '@/lib/theme-tokens'
import TurnstileWidget, { isTurnstileEnabled } from '@/components/auth/turnstile-widget'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const themeClasses = themeTokens.auth

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    // Turnstile tokens are single-use — force a fresh challenge for any retry
    const submittedCaptchaToken = captchaToken ?? undefined
    if (isTurnstileEnabled()) {
      setCaptchaToken(null)
      setCaptchaResetKey((key) => key + 1)
    }

    try {
      const { error } = await resetPassword(email, submittedCaptchaToken)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email for password reset instructions')
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
            Reset Password
          </h1>
          <p className={`text-sm ${themeClasses.secondary || themeClasses.text}`}>
            Enter your email address and we&apos;ll send you a password reset link
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className={`p-3 mb-4 border-2 border-red-500 bg-red-100 text-red-700 text-sm font-mono`}>
            {error}
          </div>
        )}

        {message && (
          <div className={`p-3 mb-4 border-2 border-green-500 bg-green-100 text-green-700 text-sm font-mono`}>
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-mono font-bold uppercase mb-2 ${themeClasses.text}`}>
              Email Address
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${themeClasses.mutedText}`} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border-2 text-sm font-mono bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses.background} ${themeClasses.borderColor} ${themeClasses.text} focus:ring-current`}
                placeholder="Enter your email"
              />
            </div>
          </div>

          <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaResetKey} />

          <button
            type="submit"
            disabled={loading || (isTurnstileEnabled() && !captchaToken)}
            className={`w-full px-4 py-3 border-2 text-sm font-mono font-bold uppercase tracking-wider transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.accentBg} ${themeClasses.borderColor} text-black ${themeClasses.glow}`}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link
            href="/auth"
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
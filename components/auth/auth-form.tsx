'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, Globe, Code, ChevronDown, ChevronUp } from 'lucide-react'
import { signIn, signUp, signInWithProvider, signInWithMagicLink } from '@/lib/supabase/auth'
import { validateRedirectPath } from '@/lib/utils/redirect-validation'
import TurnstileWidget, { isTurnstileEnabled } from '@/components/auth/turnstile-widget'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AuthFormProps {
  mode: 'signin' | 'signup'
  initialError?: string
  /** Validated internal path to return to after auth (from ?next=). */
  next?: string
}

export default function AuthForm({ mode: initialMode, initialError, next }: AuthFormProps) {
  // Google (75%+ of sign-ins) and magic link are the primary paths; the
  // password form and GitHub live behind "More options". Magic link handles
  // both sign-in and sign-up, so mode only matters for the password form.
  // Deep links to ?mode=signup (and legacy /auth/signup) open the password
  // form so the Sign Up CTA is immediately reachable.
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [showPasswordForm, setShowPasswordForm] = useState(initialMode === 'signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError ?? '')
  const [success, setSuccess] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const router = useRouter()
  const { theme } = useTheme()

  const themeClasses = getComponentStyles(theme as ThemeType, 'auth')

  const validatedNext = next ? validateRedirectPath(next) : undefined

  // Turnstile tokens are single-use — grab the current token and force a
  // fresh challenge so retries don't submit a consumed token.
  const consumeCaptchaToken = (): string | undefined => {
    const token = captchaToken ?? undefined
    if (isTurnstileEnabled()) {
      setCaptchaToken(null)
      setCaptchaResetKey((key) => key + 1)
    }
    return token
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const submittedCaptchaToken = consumeCaptchaToken()

    try {
      const { error } = await signInWithMagicLink(email, {
        redirectTo: validatedNext,
        captchaToken: submittedCaptchaToken,
      })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Check your email for a sign-in link. It signs you in on this device and creates your account if you are new.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const submittedCaptchaToken = consumeCaptchaToken()

    try {
      if (mode === 'signin') {
        const { user, error } = await signIn({ email, password, captchaToken: submittedCaptchaToken })
        if (error) {
          setError(error.message)
        } else if (user) {
          // Return the user to where they were (?next=), falling back to the
          // dashboard — consistent with the OAuth callback flow.
          router.push(validatedNext ?? '/dashboard?welcome=1')
          router.refresh()
        }
      } else {
        const { error } = await signUp({
          email,
          password,
          captchaToken: submittedCaptchaToken,
        })
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Check your email for a confirmation link to finish signing up.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      const { error } = await signInWithProvider(
        provider,
        validatedNext ? { redirectTo: validatedNext } : undefined
      )
      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth error occurred')
    } finally {
      setLoading(false)
    }
  }

  const emailInput = (
    <div className="space-y-2">
      <Label className={`font-mono font-bold uppercase ${themeClasses.text}`}>
        Email Address
      </Label>
      <div className="relative">
        <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${themeClasses.mutedText}`} />
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`pl-10 font-mono border-2 ${themeClasses.borderColor} ${themeClasses.text} ${themeClasses.background}`}
          placeholder="Enter your email"
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className={`w-full max-w-md container-primary ${themeClasses.background}`}>
        <CardHeader className="text-center space-y-4">
          <div className={`w-12 h-12 border-2 flex items-center justify-center mx-auto rounded-md ${themeClasses.accentBg} ${themeClasses.borderColor}`}>
            <span className="text-black font-bold text-lg">16</span>
          </div>
          <div>
            <CardTitle className={`text-2xl font-bold uppercase tracking-wider font-mono ${themeClasses.text}`}>
              Sign In
            </CardTitle>
            <CardDescription className={`font-mono mt-2 ${themeClasses.mutedText}`}>
              Save locations and customize your weather experience. New here? Same buttons — your account is created automatically.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {success && (
            <Alert
              className="border-2 border-green-500/50 bg-green-950/30 text-green-400 font-mono"
              data-testid="auth-success-alert"
            >
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="border-2 font-mono" data-testid="auth-error-alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Primary: Google OAuth */}
          <Button
            onClick={() => handleOAuthSignIn('google')}
            disabled={loading}
            data-testid="auth-google-button"
            className={`w-full font-mono font-bold uppercase tracking-wider h-12 text-black ${themeClasses.accentBg} hover:opacity-90`}
          >
            <Globe className="w-4 h-4 mr-2" />
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className={themeClasses.borderColor} />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className={`bg-background px-2 font-mono ${themeClasses.mutedText} ${themeClasses.background}`}>
                Or continue with email
              </span>
            </div>
          </div>

          {!showPasswordForm ? (
            /* Default email path: passwordless magic link */
            <form onSubmit={handleMagicLink} className="space-y-4" data-testid="magic-link-form">
              {emailInput}

              <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaResetKey} />

              <Button
                type="submit"
                disabled={loading || (isTurnstileEnabled() && !captchaToken)}
                data-testid="magic-link-submit"
                variant="outline"
                className={`w-full font-mono font-bold uppercase tracking-wider border-2 h-12 ${themeClasses.borderColor} ${themeClasses.text} hover:${themeClasses.accentBg} hover:text-black`}
              >
                <Mail className="w-4 h-4 mr-2" />
                {loading ? 'Loading...' : 'Email Me a Sign-In Link'}
              </Button>
            </form>
          ) : (
            /* More options: password form */
            <form onSubmit={handlePasswordSubmit} className="space-y-4" data-testid="password-form">
              {emailInput}

              <div className="space-y-2">
                <Label className={`font-mono font-bold uppercase ${themeClasses.text}`}>
                  Password
                </Label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${themeClasses.mutedText}`} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-10 pr-12 font-mono border-2 ${themeClasses.borderColor} ${themeClasses.text} ${themeClasses.background}`}
                    placeholder="Enter your password"
                    minLength={10}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-0 top-0 h-full px-3 hover:bg-transparent`}
                  >
                    {showPassword ? <EyeOff className={`w-4 h-4 ${themeClasses.mutedText}`} /> : <Eye className={`w-4 h-4 ${themeClasses.mutedText}`} />}
                  </Button>
                </div>
              </div>

              {mode === 'signin' && (
                <div className="text-right">
                  <Link
                    href="/auth/reset-password"
                    className={`text-xs font-mono hover:underline ${themeClasses.accentText}`}
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaResetKey} />

              <Button
                type="submit"
                disabled={loading || (isTurnstileEnabled() && !captchaToken)}
                className={`w-full font-mono font-bold uppercase tracking-wider h-12 text-black ${themeClasses.accentBg} hover:opacity-90`}
              >
                {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
              </Button>

              <p className={`text-sm font-mono text-center ${themeClasses.mutedText}`}>
                {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className={`font-bold hover:underline ${themeClasses.accentText}`}
                >
                  {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </form>
          )}

          {/* More options toggle: GitHub + password */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              data-testid="auth-more-options-toggle"
              className={`w-full inline-flex items-center justify-center gap-1 text-xs font-mono uppercase tracking-wider hover:underline ${themeClasses.mutedText}`}
            >
              {showPasswordForm ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Back to sign-in link
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  More options (password, GitHub)
                </>
              )}
            </button>

            {showPasswordForm && (
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn('github')}
                disabled={loading}
                className={`w-full font-mono font-bold uppercase tracking-wider border-2 h-12 ${themeClasses.borderColor} ${themeClasses.text} hover:${themeClasses.accentBg} hover:text-black`}
              >
                <Code className="w-4 h-4 mr-2" />
                Continue with GitHub
              </Button>
            )}
          </div>
        </CardContent>

        <CardFooter className="justify-center">
          <p className={`text-xs font-mono text-center ${themeClasses.mutedText}`}>
            One account for saved locations, themes, and severe weather alerts.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Globe, Mail } from 'lucide-react'
import { signInWithProvider, signInWithMagicLink } from '@/lib/supabase/auth'
import { validateRedirectPath } from '@/lib/utils/redirect-validation'
import TurnstileWidget, { isTurnstileEnabled } from '@/components/auth/turnstile-widget'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AuthGateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What the user was trying to do, e.g. "Save this location". */
  title?: string
  description?: string
  /** Internal path to return to after sign-in (validated). */
  next?: string
}

/**
 * Lightweight sign-in prompt for protected actions (saving a location,
 * subscribing to alerts). Keeps the user on the page instead of bouncing
 * them to /auth; after sign-in they return here via ?next=.
 */
export default function AuthGateModal({
  open,
  onOpenChange,
  title = 'Sign in to continue',
  description = 'One account for saved locations, themes, and severe weather alerts.',
  next,
}: AuthGateModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  useEffect(() => {
    if (!open) {
      setEmail('')
      setError('')
      setSuccess('')
      setLoading(false)
      setCaptchaToken(null)
      setCaptchaResetKey((key) => key + 1)
    }
  }, [open])

  const validatedNext = next ? validateRedirectPath(next) : undefined

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    try {
      const { error } = await signInWithProvider(
        'google',
        validatedNext ? { redirectTo: validatedNext } : undefined
      )
      if (error) setError(error.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Turnstile tokens are single-use — force a fresh challenge for retries
    const submittedCaptchaToken = captchaToken ?? undefined
    if (isTurnstileEnabled()) {
      setCaptchaToken(null)
      setCaptchaResetKey((key) => key + 1)
    }

    try {
      const { error } = await signInWithMagicLink(email, {
        redirectTo: validatedNext,
        captchaToken: submittedCaptchaToken,
      })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Check your email for a sign-in link — it will bring you right back here.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm font-mono" data-testid="auth-gate-modal">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {success ? (
            <Alert className="border-2 border-green-500/50 bg-green-950/30 text-green-400" data-testid="auth-gate-success">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : (
            <>
              {error && (
                <Alert variant="destructive" className="border-2" data-testid="auth-gate-error">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full font-bold uppercase tracking-wider h-11"
                data-testid="auth-gate-google"
              >
                <Globe className="w-4 h-4 mr-2" />
                Continue with Google
              </Button>

              <div className="text-center text-xs uppercase text-muted-foreground">
                Or get a sign-in link
              </div>

              <form onSubmit={handleMagicLink} className="space-y-3">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="border-2"
                />

                <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaResetKey} />

                <Button
                  type="submit"
                  variant="outline"
                  disabled={loading || (isTurnstileEnabled() && !captchaToken)}
                  className="w-full font-bold uppercase tracking-wider h-11 border-2"
                  data-testid="auth-gate-magic-link"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {loading ? 'Loading...' : 'Email Me a Sign-In Link'}
                </Button>
              </form>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground">
            <Link
              href={`/auth${validatedNext ? `?next=${encodeURIComponent(validatedNext)}` : ''}`}
              className="hover:underline"
            >
              All sign-in options
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

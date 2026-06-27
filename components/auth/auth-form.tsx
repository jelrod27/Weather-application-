'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, User, Globe, Code } from 'lucide-react'
import { signIn, signUp, signInWithProvider } from '@/lib/supabase/auth'
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
}

export default function AuthForm({ mode, initialError }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError ?? '')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const { theme } = useTheme()

  const themeClasses = getComponentStyles(theme as ThemeType, 'auth')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'signin') {
        const { user, error } = await signIn({ email, password })
        if (error) {
          setError(error.message)
        } else if (user) {
          // Redirect to dashboard for better UX (consistent with OAuth flow)
          router.push('/dashboard')
          router.refresh()
        }
      } else {
        const { user, error } = await signUp({
          email,
          password,
          username: username || undefined,
          full_name: fullName || undefined
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
      const { error } = await signInWithProvider(provider)
      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className={`w-full max-w-md container-primary ${themeClasses.background}`}>
        <CardHeader className="text-center space-y-4">
          <div className={`w-12 h-12 border-2 flex items-center justify-center mx-auto rounded-md ${themeClasses.accentBg} ${themeClasses.borderColor}`}>
            <span className="text-black font-bold text-lg">16</span>
          </div>
          <div>
            <CardTitle className={`text-2xl font-bold uppercase tracking-wider font-mono ${themeClasses.text}`}>
              {mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </CardTitle>
            <CardDescription className={`font-mono mt-2 ${themeClasses.mutedText}`}>
              {mode === 'signin'
                ? 'Access your weather preferences and saved locations'
                : 'Create your account to save locations and customize your experience'
              }
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

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              className={`w-full font-mono font-bold uppercase tracking-wider border-2 h-12 ${themeClasses.borderColor} ${themeClasses.text} hover:${themeClasses.accentBg} hover:text-black`}
            >
              <Globe className="w-4 h-4 mr-2" />
              Continue with Google
            </Button>

            <Button
              variant="outline"
              onClick={() => handleOAuthSignIn('github')}
              disabled={loading}
              className={`w-full font-mono font-bold uppercase tracking-wider border-2 h-12 ${themeClasses.borderColor} ${themeClasses.text} hover:${themeClasses.accentBg} hover:text-black`}
            >
              <Code className="w-4 h-4 mr-2" />
              Continue with GitHub
            </Button>
          </div>

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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label className={`font-mono font-bold uppercase ${themeClasses.text}`}>
                    Full Name (Optional)
                  </Label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${themeClasses.mutedText}`} />
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`pl-10 font-mono border-2 ${themeClasses.borderColor} ${themeClasses.text} ${themeClasses.background}`}
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={`font-mono font-bold uppercase ${themeClasses.text}`}>
                    Username (Optional)
                  </Label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${themeClasses.mutedText}`} />
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`pl-10 font-mono border-2 ${themeClasses.borderColor} ${themeClasses.text} ${themeClasses.background}`}
                      placeholder="Choose a username"
                    />
                  </div>
                </div>
              </>
            )}

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
                  minLength={6}
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

            <Button
              type="submit"
              disabled={loading}
              className={`w-full font-mono font-bold uppercase tracking-wider h-12 text-black ${themeClasses.accentBg} hover:opacity-90`}
            >
              {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className={`text-sm font-mono ${themeClasses.mutedText}`}>
            {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
            <Link
              href={mode === 'signin' ? '/auth/signup' : '/auth/login'}
              className={`font-bold hover:underline ${themeClasses.accentText}`}
            >
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
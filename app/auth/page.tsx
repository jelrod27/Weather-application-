import AuthForm from '@/components/auth/auth-form'
import { validateRedirectPath } from '@/lib/utils/redirect-validation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | 16-Bit Weather',
  description: 'Sign in or create an account to save locations and customize your weather experience.',
}

interface AuthPageProps {
  searchParams?: Promise<{ error?: string; next?: string; mode?: string }>
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = searchParams ? await searchParams : {}
  const rawError = params.error
  const initialError =
    typeof rawError === 'string' && rawError.length > 0 ? rawError : undefined
  const next =
    typeof params.next === 'string' && params.next.length > 0
      ? validateRedirectPath(params.next)
      : undefined
  const mode = params.mode === 'signup' ? 'signup' : 'signin'

  return <AuthForm mode={mode} initialError={initialError} next={next} />
}

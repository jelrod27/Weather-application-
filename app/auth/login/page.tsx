import AuthForm from '@/components/auth/auth-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | 16-Bit Weather',
  description: 'Sign in to access your saved locations and weather preferences.',
}

interface LoginPageProps {
  searchParams?: Promise<{ error?: string; next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {}
  const rawError = params.error
  const initialError =
    typeof rawError === 'string' && rawError.length > 0 ? rawError : undefined

  return <AuthForm mode="signin" initialError={initialError} />
}

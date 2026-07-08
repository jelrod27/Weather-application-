import AuthForm from '@/components/auth/auth-form'
import { validateRedirectPath } from '@/lib/utils/redirect-validation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up | 16-Bit Weather',
  description: 'Create an account to save locations and customize your weather experience.',
}

interface SignupPageProps {
  searchParams?: Promise<{ next?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = searchParams ? await searchParams : {}
  const next =
    typeof params.next === 'string' && params.next.length > 0
      ? validateRedirectPath(params.next)
      : undefined

  return <AuthForm mode="signup" next={next} />
}
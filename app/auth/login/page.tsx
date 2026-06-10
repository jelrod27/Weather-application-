import AuthForm from '@/components/auth/auth-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | 16-Bit Weather',
  description: 'Sign in to access your saved locations and weather preferences.',
}

export default function LoginPage() {
  return <AuthForm mode="signin" />
}
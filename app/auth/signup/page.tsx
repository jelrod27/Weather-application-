import AuthForm from '@/components/auth/auth-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up | 16-Bit Weather',
  description: 'Create an account to save locations and customize your weather experience.',
}

export default function SignupPage() {
  return <AuthForm mode="signup" />
}
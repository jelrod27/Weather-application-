/**
 * Unit tests for AuthForm signup success vs error alerts
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

jest.mock('@/components/theme-provider', () => ({
  useTheme: () => ({ theme: 'nord' }),
}))

jest.mock('@/lib/theme-utils', () => ({
  getComponentStyles: () => ({
    background: 'bg-test',
    text: 'text-test',
    mutedText: 'text-muted',
    borderColor: 'border-test',
    accentBg: 'bg-accent',
    accentText: 'text-accent',
  }),
}))

const mockSignUp = jest.fn()
const mockSignIn = jest.fn()
const mockSignInWithProvider = jest.fn()

const mockSignInWithMagicLink = jest.fn()

jest.mock('@/lib/supabase/auth', () => ({
  signUp: (...args: unknown[]) => mockSignUp(...args),
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signInWithProvider: (...args: unknown[]) => mockSignInWithProvider(...args),
  signInWithMagicLink: (...args: unknown[]) => mockSignInWithMagicLink(...args),
}))

import AuthForm from '@/components/auth/auth-form'

describe('AuthForm', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockRefresh.mockReset()
    mockSignUp.mockReset()
    mockSignIn.mockReset()
    mockSignInWithProvider.mockReset()
    mockSignInWithMagicLink.mockReset()
  })

  it('sends a magic link from the default email form', async () => {
    mockSignInWithMagicLink.mockResolvedValue({ data: {}, error: null })

    render(<AuthForm mode="signin" />)

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: 'new@example.com' },
    })
    fireEvent.click(screen.getByTestId('magic-link-submit'))

    await waitFor(() => {
      expect(mockSignInWithMagicLink).toHaveBeenCalled()
    })

    expect(screen.getByTestId('auth-success-alert')).toHaveTextContent(/check your email/i)
    expect(screen.queryByTestId('auth-error-alert')).not.toBeInTheDocument()
  })

  it('shows a success alert after signup without using the destructive error alert', async () => {
    mockSignUp.mockResolvedValue({ user: { id: 'user-1' }, error: null })

    render(<AuthForm mode="signup" />)

    // Password form lives behind the "More options" toggle now
    fireEvent.click(screen.getByTestId('auth-more-options-toggle'))

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: 'new@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: 'longenough123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled()
    })

    expect(screen.getByTestId('auth-success-alert')).toBeInTheDocument()
    expect(screen.queryByTestId('auth-error-alert')).not.toBeInTheDocument()
    expect(screen.getByTestId('auth-success-alert')).toHaveTextContent(/check your email/i)
  })

  it('shows a destructive alert for sign-in errors', async () => {
    mockSignIn.mockResolvedValue({
      user: null,
      error: { message: 'Invalid login credentials' },
    })

    render(<AuthForm mode="signin" initialError="OAuth failed" />)

    expect(screen.getByTestId('auth-error-alert')).toHaveTextContent(/oauth failed/i)

    // Password form lives behind the "More options" toggle now
    fireEvent.click(screen.getByTestId('auth-more-options-toggle'))

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: 'bad@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: 'wrongpass123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(screen.getByTestId('auth-error-alert')).toHaveTextContent(/invalid login credentials/i)
    })
  })
})

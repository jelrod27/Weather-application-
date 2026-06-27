import { resolveAuthenticatedAuthRouteRedirect } from '@/lib/auth/middleware-redirects'

describe('auth middleware redirect helpers', () => {
  it('defaults authenticated auth-route visitors to dashboard', () => {
    expect(resolveAuthenticatedAuthRouteRedirect(null)).toBe('/dashboard')
  })

  it('honors a validated next param', () => {
    expect(resolveAuthenticatedAuthRouteRedirect('/profile')).toBe('/profile')
  })

  it('blocks open redirects', () => {
    expect(resolveAuthenticatedAuthRouteRedirect('//evil.com')).toBe('/dashboard')
    expect(resolveAuthenticatedAuthRouteRedirect('https://evil.com')).toBe('/dashboard')
  })
})

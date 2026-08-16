import {
  needsAuthSessionLookup,
  resolveAuthenticatedAuthRouteRedirect,
} from '@/lib/auth/middleware-redirects'

describe('auth middleware redirect helpers', () => {
  it('skips Supabase getUser on public pages so a hung auth fetch cannot 504 the homepage', () => {
    expect(needsAuthSessionLookup('/')).toBe(false)
    expect(needsAuthSessionLookup('/dashboard')).toBe(false)
    expect(needsAuthSessionLookup('/radar')).toBe(false)
    expect(needsAuthSessionLookup('/api/weather/current')).toBe(false)
    expect(needsAuthSessionLookup('/auth/callback')).toBe(false)
  })

  it('looks up the session only on protected and login/signup routes', () => {
    expect(needsAuthSessionLookup('/profile')).toBe(true)
    expect(needsAuthSessionLookup('/profile/settings')).toBe(true)
    expect(needsAuthSessionLookup('/saved-locations')).toBe(true)
    expect(needsAuthSessionLookup('/auth')).toBe(true)
    expect(needsAuthSessionLookup('/auth/login')).toBe(true)
    expect(needsAuthSessionLookup('/auth/signup')).toBe(true)
  })

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

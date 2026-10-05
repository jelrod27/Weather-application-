import { act, render, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'
import { fetchUserPreferences } from '@/lib/services/preferences-service'
import { userCacheService } from '@/lib/user-cache-service'

jest.mock('@/lib/supabase/client', () => ({ supabase: { auth: {
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
} } }))
jest.mock('@/lib/supabase/database', () => ({ getProfile: jest.fn() }))
jest.mock('@/lib/services/preferences-service', () => ({ fetchUserPreferences: jest.fn() }))

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function AuthProbe(): React.JSX.Element {
  const { isInitialized, user } = useAuth()
  return <div>{isInitialized && !user ? 'Guest ready' : 'Loading'}</div>
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder-anon-key'
  localStorage.clear()
  userCacheService.savePreferences({
    settings: { units: 'metric', theme: 'synthwave84', auto_location: false, cacheEnabled: true },
    updatedAt: Date.now(),
  })
  jest.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null })
})

afterAll(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey
})

it('preserves guest choices through initial session lookup and auth notification', async () => {
  render(<AuthProvider><AuthProbe /></AuthProvider>)
  await screen.findByText('Guest ready')
  const callback = jest.mocked(supabase.auth.onAuthStateChange).mock.calls[0][0]
  await act(async () => { await callback('INITIAL_SESSION', null) })
  expect(userCacheService.getPreferences()?.settings).toMatchObject({
    units: 'metric', theme: 'synthwave84', auto_location: false,
  })
  expect(fetchUserPreferences).not.toHaveBeenCalled()
})

it('still resets mirrored account settings on a signed-out notification', async () => {
  render(<AuthProvider><AuthProbe /></AuthProvider>)
  await screen.findByText('Guest ready')
  userCacheService.updateSettings({ units: 'metric', theme: 'synthwave84', auto_location: false })
  const callback = jest.mocked(supabase.auth.onAuthStateChange).mock.calls[0][0]
  await act(async () => { await callback('SIGNED_OUT', null) })
  expect(userCacheService.getPreferences()?.settings).toMatchObject({ units: 'imperial', auto_location: true })
})

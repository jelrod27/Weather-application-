/** @jest-environment node */

import { fetchUserEmailForAlert } from '@/lib/services/severe-alert-email-db'

describe('verified severe-alert recipients', () => {
  const makeClient = (user: Record<string, unknown> | null, error: Error | null = null) => ({
    auth: { admin: { getUserById: jest.fn().mockResolvedValue({ data: { user }, error }) } },
    from: jest.fn().mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { email: 'victim@example.com' }, error: null }) }) }),
    }),
  })

  it('uses the confirmed Auth address even when the profile contains a different email', async () => {
    const client = makeClient({ email: 'owner@example.com', email_confirmed_at: '2026-09-01T00:00:00Z' })
    await expect(fetchUserEmailForAlert(client as never, 'user-1')).resolves.toBe('owner@example.com')
    expect(client.auth.admin.getUserById).toHaveBeenCalledWith('user-1')
    expect(client.from).not.toHaveBeenCalled()
  })

  it.each([null, { email: 'unverified@example.com' }, { email_confirmed_at: '2026-09-01' }])(
    'does not send when the Auth user has no confirmed email: %j', async (user) => {
      await expect(fetchUserEmailForAlert(makeClient(user) as never, 'user-1')).resolves.toBeNull()
    },
  )

  it('fails closed when the Auth lookup fails', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      await expect(fetchUserEmailForAlert(makeClient(null, new Error('unavailable')) as never, 'user-1')).resolves.toBeNull()
    } finally { log.mockRestore() }
  })
})

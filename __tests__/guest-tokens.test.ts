import {
  hashGuestToken,
  newGuestToken,
  parseSignedGuestManageToken,
  signGuestManageToken,
} from '@/lib/alerts/guest-tokens'

describe('guest-tokens', () => {
  it('hashes tokens as stable sha256 hex', () => {
    const token = 'test-token'
    expect(hashGuestToken(token)).toBe(hashGuestToken(token))
    expect(hashGuestToken(token)).toMatch(/^[a-f0-9]{64}$/)
    expect(hashGuestToken(token)).not.toBe(hashGuestToken('other'))
  })

  it('creates url-safe tokens', () => {
    const token = newGuestToken()
    expect(token.length).toBeGreaterThan(20)
    expect(token).not.toMatch(/[+/=]/)
  })

  it('round-trips a signed manage token', () => {
    const secret = 'bitwatch-test-secret'
    const id = '11111111-2222-4333-8444-555555555555'
    const token = signGuestManageToken(id, secret)
    expect(token).toBeTruthy()
    expect(parseSignedGuestManageToken(token!, secret)).toBe(id)
    expect(parseSignedGuestManageToken(token!, 'other-secret')).toBeNull()
    expect(parseSignedGuestManageToken('not-signed', secret)).toBeNull()
  })

  describe('secret rotation', () => {
    const saved = { ...process.env }
    afterEach(() => {
      process.env = { ...saved }
    })

    it('signs with the first configured secret and verifies against every configured secret', () => {
      const id = '11111111-2222-4333-8444-555555555555'
      process.env.BITWATCH_MANAGE_SECRET = 'new-secret'
      process.env.BITWATCH_MANAGE_SECRET_PREVIOUS = 'old-secret'
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      delete process.env.CRON_SECRET

      const oldToken = signGuestManageToken(id, 'old-secret')
      const newToken = signGuestManageToken(id)

      expect(newToken).toBe(signGuestManageToken(id, 'new-secret'))
      expect(parseSignedGuestManageToken(newToken!)).toBe(id)
      expect(parseSignedGuestManageToken(oldToken!)).toBe(id)
      expect(parseSignedGuestManageToken(signGuestManageToken(id, 'unknown')!)).toBeNull()
    })

    it('falls back to the service role key when no dedicated secret is set', () => {
      const id = '11111111-2222-4333-8444-555555555555'
      delete process.env.BITWATCH_MANAGE_SECRET
      delete process.env.BITWATCH_MANAGE_SECRET_PREVIOUS
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
      delete process.env.CRON_SECRET

      const token = signGuestManageToken(id)
      expect(token).toBe(signGuestManageToken(id, 'service-role'))
      expect(parseSignedGuestManageToken(token!)).toBe(id)
    })

    it('verifies with only the explicit secret when one is passed', () => {
      const id = '11111111-2222-4333-8444-555555555555'
      process.env.BITWATCH_MANAGE_SECRET = 'new-secret'
      const token = signGuestManageToken(id, 'new-secret')
      expect(parseSignedGuestManageToken(token!, 'other')).toBeNull()
    })
  })
})

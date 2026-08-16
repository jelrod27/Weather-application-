import { hashGuestToken, newGuestToken } from '@/lib/alerts/guest-tokens'

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
})

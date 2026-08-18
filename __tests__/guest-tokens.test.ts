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
})

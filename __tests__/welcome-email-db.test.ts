import { adminHeaders } from '@/lib/services/welcome-email-db'

describe('adminHeaders', () => {
  it('sends a legacy service-role JWT on both apikey and Authorization', () => {
    const headers = adminHeaders('eyJhbGciOiJIUzI1NiJ9.legacy.jwt') as Record<string, string>
    expect(headers.apikey).toBe('eyJhbGciOiJIUzI1NiJ9.legacy.jwt')
    expect(headers.Authorization).toBe('Bearer eyJhbGciOiJIUzI1NiJ9.legacy.jwt')
  })

  it('sends a new-style secret key on apikey only', () => {
    const headers = adminHeaders('sb_secret_abc123') as Record<string, string>
    expect(headers.apikey).toBe('sb_secret_abc123')
    expect(headers).not.toHaveProperty('Authorization')
  })
})

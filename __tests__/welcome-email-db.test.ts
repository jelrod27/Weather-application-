import { adminHeaders } from '@/lib/services/welcome-email-db'

describe('adminHeaders', () => {
  it('sends a legacy service-role JWT on both apikey and Authorization', () => {
    const headers = adminHeaders('legacy-service-role-key') as Record<string, string>
    expect(headers.apikey).toBe('legacy-service-role-key')
    expect(headers.Authorization).toBe('Bearer legacy-service-role-key')
  })

  it('sends a new-style secret key on apikey only', () => {
    const headers = adminHeaders('sb_secret_abc123') as Record<string, string>
    expect(headers.apikey).toBe('sb_secret_abc123')
    expect(headers).not.toHaveProperty('Authorization')
  })
})

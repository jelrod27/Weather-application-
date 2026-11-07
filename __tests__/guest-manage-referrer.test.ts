/** @jest-environment node */
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

describe('guest capability page referrer policy', () => {
  it.each(['/alerts/manage', '/alerts/verify', '/alerts/manage/'])('suppresses referring URLs on %s', async path => {
    const response = await middleware(new NextRequest(`https://example.invalid${path}?token=dummy`))
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
  })
})

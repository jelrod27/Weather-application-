/** @jest-environment node */
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

describe('PostHog content security policy', () => {
  it('allows regional ingestion while retaining the existing script restrictions', async () => {
    const response = await middleware(new NextRequest('https://weather.example/'))
    const directives = response.headers.get('Content-Security-Policy')!.split('; ')
    const connections = directives.find(directive => directive.startsWith('connect-src '))!
    expect(connections).toContain('https://us.i.posthog.com')
    expect(connections).toContain('https://eu.i.posthog.com')
    expect(directives).toContain("object-src 'none'")
    expect(directives.find(directive => directive.startsWith('script-src '))).not.toContain('posthog.com')
  })
})

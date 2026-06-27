/** @jest-environment jsdom */

const mockCapture = jest.fn()
const mockIdentify = jest.fn()
const mockReset = jest.fn()
const mockInit = jest.fn()

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    init: mockInit,
    capture: mockCapture,
    identify: mockIdentify,
    reset: mockReset,
  },
}))

describe('posthog analytics', () => {
  const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

  beforeEach(() => {
    jest.resetModules()
    mockCapture.mockClear()
    mockIdentify.mockClear()
    mockReset.mockClear()
    mockInit.mockClear()
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key'
  })

  afterAll(() => {
    if (originalKey !== undefined) {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey
    } else {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    }
  })

  it('initializes PostHog when key is set', async () => {
    const { initPostHog } = await import('@/lib/analytics/posthog')
    const client = await initPostHog()

    expect(client).not.toBeNull()
    expect(mockInit).toHaveBeenCalledWith(
      'phc_test_key',
      expect.objectContaining({
        person_profiles: 'identified_only',
        capture_pageview: false,
      }),
    )
  })

  it('no-ops capture when key is unset', async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    const { captureAnalyticsEvent } = await import('@/lib/analytics/posthog')

    captureAnalyticsEvent('signup_started')

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('captures named events after init', async () => {
    const { captureAnalyticsEvent } = await import('@/lib/analytics/posthog')

    captureAnalyticsEvent('user_signed_in', { provider: 'google' })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockCapture).toHaveBeenCalledWith('user_signed_in', { provider: 'google' })
  })

  it('identifies users with traits', async () => {
    const { identifyAnalyticsUser } = await import('@/lib/analytics/posthog')

    identifyAnalyticsUser('user-123', { email: 'test@example.com' })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockIdentify).toHaveBeenCalledWith('user-123', { email: 'test@example.com' })
  })
})

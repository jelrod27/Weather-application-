import {
  isEligibleForWelcomeEmail,
  maybeSendWelcomeEmail,
  sendWelcomeEmail,
  markWelcomeEmailSent,
} from '@/lib/services/welcome-email-service'
import { resolvePostAuthRedirect } from '@/lib/auth/post-auth-redirect'

jest.mock('@/lib/services/resend-client', () => ({
  getResendFromConfig: jest.fn(),
}))

jest.mock('@/lib/services/welcome-email-db', () => ({
  fetchWelcomeEmailProfile: jest.fn(),
  markWelcomeEmailSentViaRest: jest.fn(),
}))

const mockGetResendFromConfig = jest.requireMock('@/lib/services/resend-client')
  .getResendFromConfig as jest.Mock
const mockFetchWelcomeEmailProfile = jest.requireMock('@/lib/services/welcome-email-db')
  .fetchWelcomeEmailProfile as jest.Mock
const mockMarkWelcomeEmailSentViaRest = jest.requireMock('@/lib/services/welcome-email-db')
  .markWelcomeEmailSentViaRest as jest.Mock

describe('welcome email eligibility', () => {
  it('requires confirmed email and no prior send', () => {
    expect(
      isEligibleForWelcomeEmail(
        { id: 'u1', email: 'a@b.com', emailConfirmedAt: '2026-01-01T00:00:00Z' },
        { username: null, fullName: null, welcomeEmailSentAt: null },
      ),
    ).toBe(true)

    expect(
      isEligibleForWelcomeEmail(
        { id: 'u1', email: 'a@b.com', emailConfirmedAt: null },
        { username: null, fullName: null, welcomeEmailSentAt: null },
      ),
    ).toBe(false)

    expect(
      isEligibleForWelcomeEmail(
        { id: 'u1', email: 'a@b.com', emailConfirmedAt: '2026-01-01T00:00:00Z' },
        { username: null, fullName: null, welcomeEmailSentAt: '2026-01-02T00:00:00Z' },
      ),
    ).toBe(false)
  })
})

describe('resolvePostAuthRedirect', () => {
  it('adds welcome query when redirecting to bare dashboard', () => {
    expect(resolvePostAuthRedirect('/dashboard')).toBe('/dashboard?welcome=1')
    expect(resolvePostAuthRedirect('/profile')).toBe('/profile')
  })
})

describe('sendWelcomeEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns not configured when Resend env is missing', async () => {
    mockGetResendFromConfig.mockReturnValue(null)
    const result = await sendWelcomeEmail({ email: 'user@example.com', displayName: 'Alex' })
    expect(result.sent).toBe(false)
    expect(result.reason).toMatch(/not configured/i)
  })

  it('sends via Resend when configured', async () => {
    const send = jest.fn().mockResolvedValue({ error: null })
    mockGetResendFromConfig.mockReturnValue({
      resend: { emails: { send } },
      fromEmail: '16 Bit Weather <noreply@16bitweather.co>',
    })

    const result = await sendWelcomeEmail({ email: 'user@example.com', displayName: 'Alex' })
    expect(result.sent).toBe(true)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Welcome to 16 Bit Weather',
      }),
    )
  })
})

describe('maybeSendWelcomeEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role'
    mockFetchWelcomeEmailProfile.mockResolvedValue({
      username: 'alex',
      fullName: null,
      welcomeEmailSentAt: null,
    })
    mockMarkWelcomeEmailSentViaRest.mockResolvedValue(true)
  })

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('skips when service role key is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const result = await maybeSendWelcomeEmail({
      id: 'u1',
      email: 'user@example.com',
      emailConfirmedAt: '2026-01-01T00:00:00Z',
    })
    expect(result.skipped).toBe(true)
    expect(result.sent).toBe(false)
  })

  it('sends once for eligible confirmed users', async () => {
    const send = jest.fn().mockResolvedValue({ error: null })
    mockGetResendFromConfig.mockReturnValue({
      resend: { emails: { send } },
      fromEmail: '16 Bit Weather <noreply@16bitweather.co>',
    })

    const result = await maybeSendWelcomeEmail({
      id: 'u1',
      email: 'user@example.com',
      emailConfirmedAt: '2026-01-01T00:00:00Z',
    })

    expect(result.sent).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
    expect(mockMarkWelcomeEmailSentViaRest).toHaveBeenCalledWith('u1')
  })
})

describe('markWelcomeEmailSent', () => {
  it('delegates to REST helper', async () => {
    mockMarkWelcomeEmailSentViaRest.mockResolvedValue(true)
    await expect(markWelcomeEmailSent('u1')).resolves.toBe(true)
    expect(mockMarkWelcomeEmailSentViaRest).toHaveBeenCalledWith('u1')
  })
})

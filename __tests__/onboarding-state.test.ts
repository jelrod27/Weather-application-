import {
  clearOnboardingDismissed,
  dismissOnboarding,
  getOnboardingDismissKey,
  isOnboardingDismissed,
} from '@/lib/dashboard/onboarding-state'

const USER_ID = 'user-abc-123'

describe('onboarding-state', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('builds a per-user dismiss key', () => {
    expect(getOnboardingDismissKey(USER_ID)).toBe(`dashboard-onboarding-dismissed:${USER_ID}`)
  })

  it('starts undismissed and persists dismiss', () => {
    expect(isOnboardingDismissed(USER_ID)).toBe(false)

    dismissOnboarding(USER_ID)

    expect(isOnboardingDismissed(USER_ID)).toBe(true)
    expect(window.localStorage.getItem(getOnboardingDismissKey(USER_ID))).toBe('1')
  })

  it('clears dismiss state', () => {
    dismissOnboarding(USER_ID)
    clearOnboardingDismissed(USER_ID)
    expect(isOnboardingDismissed(USER_ID)).toBe(false)
  })
})

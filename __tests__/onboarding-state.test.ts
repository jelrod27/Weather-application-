import {
  clearOnboardingDismissed,
  dismissOnboarding,
  getOnboardingDismissKey,
  getWelcomeModalSessionKey,
  isOnboardingDismissed,
} from '@/lib/dashboard/onboarding-state'

const USER_ID = 'user-abc-123'

describe('onboarding-state', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('builds a per-user dismiss key', () => {
    expect(getOnboardingDismissKey(USER_ID)).toBe(`dashboard-onboarding-dismissed:${USER_ID}`)
    expect(getWelcomeModalSessionKey(USER_ID)).toBe(`dashboard-welcome-modal-opened:${USER_ID}`)
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

  it('falls back safely when localStorage throws', () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })

    expect(isOnboardingDismissed(USER_ID)).toBe(false)
    expect(() => dismissOnboarding(USER_ID)).not.toThrow()
    expect(() => clearOnboardingDismissed(USER_ID)).not.toThrow()

    getItem.mockRestore()
    setItem.mockRestore()
  })
})

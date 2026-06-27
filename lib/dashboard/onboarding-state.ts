const DISMISS_PREFIX = 'dashboard-onboarding-dismissed:'
const WELCOME_MODAL_PREFIX = 'dashboard-welcome-modal-opened:'

export function getOnboardingDismissKey(userId: string): string {
  return `${DISMISS_PREFIX}${userId}`
}

export function getWelcomeModalSessionKey(userId: string): string {
  return `${WELCOME_MODAL_PREFIX}${userId}`
}

export function isOnboardingDismissed(userId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(getOnboardingDismissKey(userId)) === '1'
  } catch {
    return false
  }
}

export function dismissOnboarding(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(getOnboardingDismissKey(userId), '1')
  } catch {
    // Storage unavailable; dismissal won't persist this session.
  }
}

export function clearOnboardingDismissed(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(getOnboardingDismissKey(userId))
  } catch {
    // Storage unavailable.
  }
}

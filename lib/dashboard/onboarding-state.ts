const DISMISS_PREFIX = 'dashboard-onboarding-dismissed:'

export function getOnboardingDismissKey(userId: string): string {
  return `${DISMISS_PREFIX}${userId}`
}

export function isOnboardingDismissed(userId: string): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(getOnboardingDismissKey(userId)) === '1'
}

export function dismissOnboarding(userId: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getOnboardingDismissKey(userId), '1')
}

export function clearOnboardingDismissed(userId: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(getOnboardingDismissKey(userId))
}

/** PostHog event names — keep stable for funnel dashboards. */
export const AnalyticsEvents = {
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_EMAIL_SENT: 'signup_email_sent',
  OAUTH_SIGN_IN_STARTED: 'oauth_sign_in_started',
  USER_SIGNED_IN: 'user_signed_in',
  FIRST_LOCATION_SAVED: 'first_location_saved',
  ONBOARDING_DISMISSED: 'onboarding_dismissed',
} as const

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents]

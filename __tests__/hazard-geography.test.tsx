import { render, screen } from '@testing-library/react'
import HappeningNowCard from '@/components/home/happening-now-card'
import { GuestAlertSignup } from '@/components/alerts/guest-alert-signup'
import { warningCoverageCopy } from '@/lib/warnings/coverage-status'

jest.mock('@/components/auth/turnstile-widget', () => ({ __esModule: true, default: () => null, isTurnstileEnabled: () => false }))
it.each(['outside-nws', 'unavailable'] as const)('shows %s without an all-clear', (coverage) => {
  render(<HappeningNowCard count={null} headline="" severity={null} topAlertId={null} accentColor="#aaa" coverage={coverage} />)
  expect(screen.queryByText(/No warnings|No active alerts/)).not.toBeInTheDocument()
  expect(screen.getByText(warningCoverageCopy(coverage))).toBeInTheDocument()
})
it('changing the viewed city does not submit or move an email subscription', () => {
  const original = global.fetch
  global.fetch = jest.fn()
  try {
    const { rerender } = render(<GuestAlertSignup pin={{ lat: 40, lon: -74, label: 'New York' }} />)
    rerender(<GuestAlertSignup pin={{ lat: 51.5, lon: -.12, label: 'London' }} />)
    expect(screen.getByText(/Existing email subscriptions stay/)).toBeInTheDocument()
    expect(screen.getByText(/New subscription location: London/)).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  } finally { global.fetch = original }
})

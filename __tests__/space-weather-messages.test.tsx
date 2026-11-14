import { act, fireEvent, render, screen } from '@testing-library/react'
import Ticker from '@/components/space-weather/SpaceWeatherAlertTicker'

it('labels historical messages as recent messages rather than active alerts', () => {
  render(<Ticker alerts={[{ id: 'old', type: 'warning', severity: 'severe', title: 'Old storm', issuedAt: '2020-01-01T00:00:00Z', summary: 'Expired warning' }]} />)
  expect(screen.getByText('1 RECENT')).toBeInTheDocument()
  expect(screen.queryByText(/ACTIVE/)).not.toBeInTheDocument()
  expect(screen.getByText(/expired or superseded/)).toBeInTheDocument()
})
it('does not imply all-clear when the recent feed is empty', () => {
  render(<Ticker alerts={[]} />)
  expect(screen.queryByText('ALL QUIET')).not.toBeInTheDocument()
  expect(screen.getByText(/No recent messages available/)).toBeInTheDocument()
})
it('distinguishes an unavailable feed from an empty feed', () => {
  render(<Ticker alerts={[]} unavailable />)
  expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument()
  expect(screen.getByText(/temporarily unavailable/)).toBeInTheDocument()
  expect(screen.queryByText('NO MESSAGES')).not.toBeInTheDocument()
})

it('names message controls and lets the reader pause automatic rotation', () => {
  jest.useFakeTimers()
  try {
    render(<Ticker alerts={[
      { id: 'one', type: 'message', severity: 'info', title: 'First bulletin', issuedAt: '2026-11-13T00:00:00Z', summary: 'First summary' },
      { id: 'two', type: 'watch', severity: 'minor', title: 'Second bulletin', issuedAt: '2026-11-13T01:00:00Z', summary: 'Second summary' },
    ]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pause message rotation' }))
    act(() => { jest.advanceTimersByTime(20000) })
    expect(screen.getByText('First bulletin')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next NOAA message' }))
    expect(screen.getByText('Second bulletin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show NOAA message 2' })).toHaveAttribute('aria-current', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Previous NOAA message' }))
    expect(screen.getByText('First bulletin')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Resume message rotation' }))
    act(() => { jest.advanceTimersByTime(5000) })
    expect(screen.getByText('Second bulletin')).toBeInTheDocument()
  } finally { jest.useRealTimers() }
})

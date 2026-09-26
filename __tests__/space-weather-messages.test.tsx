import { render, screen } from '@testing-library/react'
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

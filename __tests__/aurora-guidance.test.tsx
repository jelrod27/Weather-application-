import { fireEvent, render, screen } from '@testing-library/react'
import { viewlineFor } from '@/lib/space-weather/kp-scale'
import AuroraForecastMap from '@/components/space-weather/AuroraForecastMap'
import KpIndexGauge from '@/components/space-weather/KpIndexGauge'

it.each([[0, 66], [1, 66], [2, 64], [2.99, 64], [3, 58], [4, 55], [5, 50], [6, 48], [7, 45], [8, 42], [9, 40]])('uses one approximate viewline for Kp %s', (kp, latitude) => {
  expect(viewlineFor(kp)?.latitude).toBe(latitude)
})
it.each([NaN, Infinity, -1, 10, null, undefined])('does not invent a viewline for %s', (kp) => {
  expect(viewlineFor(kp)).toBeNull()
})
it('changes both latitude and guidance with the hemisphere, ignoring legacy API prose', () => {
  render(<AuroraForecastMap data={{ currentKp: 3, hemisphere: 'north', updatedAt: '', viewline: { latitude: 62, description: 'Legacy northern claim' } }} />)
  expect(screen.getByText('58°N')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'SOUTHERN' }))
  expect(screen.getByText('58°S')).toBeInTheDocument()
  expect(screen.getByText(/Southern Hemisphere/)).toBeInTheDocument()
  expect(screen.queryByText(/Scotland|Alaska|Legacy/)).not.toBeInTheDocument()
})
it('gauge uses shared regional copy and leaves missing Kp unavailable', () => {
  const { rerender } = render(<KpIndexGauge data={{ current: { value: 5, timeTag: '' }, forecast: null }} />)
  expect(screen.getByText(/Canadian border/)).toBeInTheDocument()
  rerender(<KpIndexGauge data={null} />)
  expect(screen.getByText(/Kp unavailable/)).toBeInTheDocument()
  expect(screen.queryByText('QUIET')).not.toBeInTheDocument()
})
it('follows delayed hemisphere data and preserves manual selection during refreshes', () => {
  const { rerender } = render(<AuroraForecastMap data={null} />)
  const data = { currentKp: 3, hemisphere: 'south' as const, updatedAt: '', viewline: null }
  rerender(<AuroraForecastMap data={data} />)
  expect(screen.getByText('58°S')).toBeInTheDocument()
  expect(screen.getByText('SOUTH POLE VIEW')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'NORTHERN' }))
  rerender(<AuroraForecastMap data={{ ...data, currentKp: 5 }} />)
  expect(screen.getByText('50°N')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'SOUTHERN' }))
  rerender(<AuroraForecastMap data={{ ...data, hemisphere: 'north' }} />)
  expect(screen.getByText('58°N')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'SOUTHERN' }))
  rerender(<AuroraForecastMap data={{ ...data, hemisphere: 'north', currentKp: 4 }} />)
  expect(screen.getByText('55°S')).toBeInTheDocument()
  rerender(<AuroraForecastMap data={null} />)
  rerender(<AuroraForecastMap data={{ ...data, hemisphere: 'north' }} />)
  expect(screen.getByText('58°S')).toBeInTheDocument()
})

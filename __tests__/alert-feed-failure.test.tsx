import { act, fireEvent, render, screen } from '@testing-library/react'
import SevereAlerts from '@/app/severe/severe-alerts'
import WISBadge from '@/components/wis-badge'

const realFetch = global.fetch
beforeEach(() => jest.useFakeTimers())
afterEach(() => { jest.useRealTimers(); global.fetch = realFetch })
describe('Severe alert refresh', () => {
  it('keeps an existing list visible during a background refresh', async () => {
    let finish!: (response: unknown) => void
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ alerts: [{ id: 'test', event: 'Tornado Warning', severity: 'Severe', areaDesc: 'Test County' }] }) })
      .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    await act(async () => { render(<SevereAlerts />) })
    await act(async () => { jest.advanceTimersByTime(300000) })
    expect(screen.getByText('Tornado Warning')).toBeInTheDocument()
    expect(screen.queryByText('SCANNING FOR SEVERE WEATHER...')).not.toBeInTheDocument()
    await act(async () => finish({ ok: true, json: async () => ({ alerts: [] }) }))
    expect(screen.getByText('NO MATCHING NWS ALERTS')).toBeInTheDocument()
  })
})
it('shows unavailable instead of all clear after a failed severe feed', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false })
  await act(async () => { render(<SevereAlerts />) })
  expect(screen.queryByText('ALL CLEAR')).not.toBeInTheDocument()
  expect(screen.getByText(/Alert status unavailable/)).toBeInTheDocument()
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ alerts: [] }) })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry severe alerts' })) })
  expect(screen.getByText('NO MATCHING NWS ALERTS')).toBeInTheDocument()
})
it('removes a previously displayed intensity score when its refresh fails', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ score: 25, level: 'yellow', label: 'MODERATE', totalAlerts: 30 }) }).mockResolvedValue({ ok: false })
  await act(async () => { render(<WISBadge />) })
  expect(screen.getByText('25')).toBeInTheDocument()
  await act(async () => { jest.advanceTimersByTime(300000) })
  expect(screen.queryByText('25')).not.toBeInTheDocument()
})

import { render, screen } from '@testing-library/react'
import WorstCorridors from '@/components/travel/WorstCorridors'
import { summarizeCorridor, getWorstCorridors, DEFAULT_WEATHER_CONDITIONS } from '@/lib/services/travel-corridor-service'
const clear = { ...DEFAULT_WEATHER_CONDITIONS, sampledAt: '2026-09-26T20:00:00Z', timeZone: 'America/Denver' }
it('highlights a windy point despite a low route average', () => {
  const result = summarizeCorridor('I-70', [[40, -105], [41, -104], [42, -103]], [clear, { ...clear, windGusts: 60 }, clear])
  expect(result.score).toBe(3)
  expect(result.worstPoint?.score).toBe(10)
  expect(result.level).toBe('yellow')
  render(<WorstCorridors corridors={[result]} isLoading={false} />)
  expect(screen.queryByText('CLEAR')).not.toBeInTheDocument()
  expect(screen.getByText('CAUTION')).toBeInTheDocument()
  expect(screen.getByText(/high winds/i)).toBeInTheDocument()
  expect(screen.getByText(/route average/i)).toHaveTextContent('3')
  expect(screen.getByText(/41.00/)).toBeInTheDocument()
})
it('ranks a concentrated severe point above a higher quiet route average', () => {
  const severe = summarizeCorridor('Severe', [[40,-105], [41,-104], [42,-103]], [{ ...clear, precipitation: 20, snowfall: 3, windGusts: 120, visibility: 100 }, clear, clear])
  const rain = summarizeCorridor('Rain', [[40,-105]], [{ ...clear, precipitation: 5, windGusts: 70 }])
  expect(getWorstCorridors([rain, severe], 2)[0].name).toBe('Severe')
})
it('shows incomplete and wholly missing coverage without all-clear claims', () => {
  const partial = summarizeCorridor('Partial', [[40,-105], [41,-104]], [clear, null])
  const missing = summarizeCorridor('Missing', [[40,-105]], [null])
  expect(partial.level).toBe('unknown')
  expect(partial.coverage).toEqual({ available: 1, total: 2 })
  expect(missing.score).toBe(-1)
  const { rerender } = render(<WorstCorridors corridors={[partial, missing]} isLoading={false} />)
  expect(screen.getByText(/1 of 2/)).toBeInTheDocument()
  expect(screen.queryByText('ALL CLEAR')).not.toBeInTheDocument()
  rerender(<WorstCorridors corridors={[]} isLoading={false} />)
  expect(screen.getByText(/conditions unavailable/i)).toBeInTheDocument()
})

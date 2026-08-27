/**
 * Unit tests for SavedLocationsPanel (dashboard)
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

// LocationCard hits Supabase + network — stub it out for this panel test
jest.mock('@/components/dashboard/location-card', () => ({
  __esModule: true,
  default: ({ location }: { location: { id: string; location_name: string } }) => (
    <div data-testid={`location-card-${location.id}`}>{location.location_name}</div>
  ),
}))

import SavedLocationsPanel from '@/components/dashboard/saved-locations-panel'
import type { SavedLocation } from '@/lib/supabase/types'

const makeLocation = (overrides: Partial<SavedLocation> = {}): SavedLocation => ({
  id: 'loc-1',
  user_id: 'user-1',
  location_name: 'Seattle, WA',
  city: 'Seattle',
  state: 'WA',
  country: 'US',
  latitude: 47.6,
  longitude: -122.3,
  is_favorite: false,
  custom_name: null,
  notes: null,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
  ...overrides,
})

describe('SavedLocationsPanel', () => {
  it('renders the empty state when there are no saved locations', () => {
    render(
      <SavedLocationsPanel
        locations={[]}
        loading={false}
        onUpdate={() => {}}
        onAddLocation={() => {}}
      />,
    )

    expect(screen.getByTestId('saved-locations-empty')).toBeInTheDocument()
    expect(screen.getByText(/No Saved Locations/i)).toBeInTheDocument()
    // Empty-state CTA + header "Add" button
    expect(screen.getAllByRole('button', { name: /add/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /go to search/i })).toBeInTheDocument()
  })

  it('renders a grid of saved locations split into favorites and others', () => {
    const locations = [
      makeLocation({ id: 'loc-1', location_name: 'Seattle, WA', is_favorite: true }),
      makeLocation({ id: 'loc-2', location_name: 'Austin, TX' }),
      makeLocation({ id: 'loc-3', location_name: 'Miami, FL' }),
    ]

    render(
      <SavedLocationsPanel
        locations={locations}
        loading={false}
        onUpdate={() => {}}
        onAddLocation={() => {}}
      />,
    )

    expect(screen.getByTestId('saved-locations-list')).toBeInTheDocument()
    expect(screen.queryByTestId('saved-locations-empty')).not.toBeInTheDocument()
    expect(screen.getByTestId('location-card-loc-1')).toHaveTextContent('Seattle, WA')
    expect(screen.getByTestId('location-card-loc-2')).toHaveTextContent('Austin, TX')
    expect(screen.getByTestId('location-card-loc-3')).toHaveTextContent('Miami, FL')
    expect(screen.getByText(/Favorites \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Other Locations \(2\)/i)).toBeInTheDocument()
  })
})

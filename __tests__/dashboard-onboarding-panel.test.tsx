import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('@/components/theme-provider', () => ({
  useTheme: () => ({ theme: 'nord' }),
}))

jest.mock('@/lib/theme-utils', () => ({
  getComponentStyles: () => ({
    background: 'bg-test',
    text: 'text-test',
    mutedText: 'text-muted',
    borderColor: 'border-test',
    accentBg: 'bg-accent',
    accentText: 'text-accent',
    glow: '',
  }),
}))

const mockGetCurrentLocation = jest.fn()
jest.mock('@/lib/location-service', () => ({
  LocationService: {
    getInstance: () => ({
      getCurrentLocation: mockGetCurrentLocation,
    }),
  },
}))

const mockSaveUserLocation = jest.fn()
jest.mock('@/lib/dashboard/save-user-location', () => ({
  saveUserLocation: (...args: unknown[]) => mockSaveUserLocation(...args),
}))

const mockDismissOnboarding = jest.fn()
jest.mock('@/lib/dashboard/onboarding-state', () => ({
  dismissOnboarding: (...args: unknown[]) => mockDismissOnboarding(...args),
}))

import DashboardOnboardingPanel from '@/components/dashboard/dashboard-onboarding-panel'

describe('DashboardOnboardingPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders welcome copy and CTAs', () => {
    render(
      <DashboardOnboardingPanel
        userId="user-1"
        displayName="Alex"
        onAddLocation={jest.fn()}
        onLocationSaved={jest.fn()}
        onDismiss={jest.fn()}
      />,
    )

    expect(screen.getByTestId('dashboard-onboarding-panel')).toBeInTheDocument()
    expect(screen.getByText(/Welcome, Alex!/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add location/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /use my location/i })).toBeInTheDocument()
  })

  it('calls onAddLocation when Add Location is clicked', () => {
    const onAddLocation = jest.fn()
    render(
      <DashboardOnboardingPanel
        userId="user-1"
        displayName=""
        onAddLocation={onAddLocation}
        onLocationSaved={jest.fn()}
        onDismiss={jest.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /add location/i }))
    expect(onAddLocation).toHaveBeenCalledTimes(1)
  })

  it('dismisses onboarding when Skip is clicked', () => {
    const onDismiss = jest.fn()
    render(
      <DashboardOnboardingPanel
        userId="user-1"
        displayName=""
        onAddLocation={jest.fn()}
        onLocationSaved={jest.fn()}
        onDismiss={onDismiss}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }))
    expect(mockDismissOnboarding).toHaveBeenCalledWith('user-1')
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('saves geolocation and notifies parent on Use My Location success', async () => {
    mockGetCurrentLocation.mockResolvedValue({
      city: 'Portland',
      region: 'OR',
      country: 'US',
      displayName: 'Portland, OR',
      latitude: 45.5,
      longitude: -122.6,
    })
    mockSaveUserLocation.mockResolvedValue(undefined)

    const onLocationSaved = jest.fn()
    const onDismiss = jest.fn()
    render(
      <DashboardOnboardingPanel
        userId="user-1"
        displayName=""
        onAddLocation={jest.fn()}
        onLocationSaved={onLocationSaved}
        onDismiss={onDismiss}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /use my location/i }))

    await waitFor(() => {
      expect(mockSaveUserLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'Portland',
          state: 'OR',
          country: 'US',
          is_favorite: true,
        }),
      )
      expect(mockDismissOnboarding).toHaveBeenCalledWith('user-1')
      expect(onDismiss).toHaveBeenCalledTimes(1)
      expect(onLocationSaved).toHaveBeenCalledTimes(1)
    })
  })
})

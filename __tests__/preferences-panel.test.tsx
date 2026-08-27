/**
 * Unit tests for PreferencesPanel (dashboard)
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// AI personality selector was removed alongside the chat feature in Phase 4.
// The PreferencesPanel no longer renders or imports it.

jest.mock('@/lib/auth', () => {
  const STABLE_USER = { id: 'user-1' }
  const STABLE_PROFILE = { default_location: null, username: 'tester' }
  const STABLE_PREFERENCES = {
    id: 'pref-1',
    user_id: 'user-1',
    theme: 'nord',
    temperature_unit: 'fahrenheit',
    wind_unit: 'mph',
    pressure_unit: 'hpa',
    auto_location: false,
    notifications_enabled: false,
    email_alerts: false,
    severe_weather_alerts: false,
    daily_forecast_email: false,
    news_ticker_enabled: true,
    animation_enabled: true,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  }
  const refreshPreferences = jest.fn()
  const refreshProfile = jest.fn()
  return {
    __mocks: { refreshPreferences, refreshProfile },
    useAuth: () => ({
      user: STABLE_USER,
      profile: STABLE_PROFILE,
      preferences: STABLE_PREFERENCES,
      refreshPreferences,
      refreshProfile,
    }),
  }
})

const authMock = jest.requireMock('@/lib/auth') as {
  __mocks: { refreshPreferences: jest.Mock; refreshProfile: jest.Mock }
}
const { refreshPreferences, refreshProfile } = authMock.__mocks

const mockUpdatePreferencesAPI = jest.fn()
jest.mock('@/lib/services/preferences-service', () => ({
  updateUserPreferencesAPI: (...args: unknown[]) => mockUpdatePreferencesAPI(...args),
}))

jest.mock('@/lib/supabase/database', () => ({
  updateProfile: jest.fn(),
}))

import PreferencesPanel from '@/components/dashboard/preferences-panel'

describe('PreferencesPanel', () => {
  beforeEach(() => {
    mockUpdatePreferencesAPI.mockReset()
    refreshPreferences.mockReset()
    refreshProfile.mockReset()
  })

  it('persists a temperature unit change via the preferences API', async () => {
    mockUpdatePreferencesAPI.mockResolvedValue({
      id: 'pref-1',
      user_id: 'user-1',
      temperature_unit: 'celsius',
      wind_unit: 'mph',
    })

    render(<PreferencesPanel locations={[]} />)

    // Flip to Celsius
    const radios = screen.getAllByRole('radio')
    const celsiusButton = radios.find((el) => el.textContent?.includes('°C'))!
    expect(celsiusButton).toBeDefined()
    fireEvent.click(celsiusButton)
    expect(celsiusButton).toHaveAttribute('aria-checked', 'true')

    const saveButton = screen.getByRole('button', { name: /save preferences/i })
    expect(saveButton).not.toBeDisabled()
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockUpdatePreferencesAPI).toHaveBeenCalledTimes(1)
    })
    expect(mockUpdatePreferencesAPI).toHaveBeenCalledWith(
      expect.objectContaining({ temperature_unit: 'celsius' }),
    )
    await waitFor(() => {
      expect(refreshPreferences).toHaveBeenCalled()
    })
    expect(await screen.findByText(/preferences saved/i)).toBeInTheDocument()
  })

  it('hides the default-location picker hint when locations are available', () => {
    render(
      <PreferencesPanel
        locations={[
          {
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
          },
        ]}
      />,
    )

    expect(screen.queryByTestId('default-location-empty-hint')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/default location/i)).toBeInTheDocument()
  })
})

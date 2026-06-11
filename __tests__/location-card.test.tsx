/**
 * Unit tests for LocationCard component — parallel fetch behaviour.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { SavedLocation } from '@/lib/supabase/types'

// Mock the theme provider (same pattern as current-conditions.test.tsx)
jest.mock('@/components/theme-provider', () => ({
  useTheme: () => ({ theme: 'dark' }),
}))

// Mock theme-utils
jest.mock('@/lib/theme-utils', () => ({
  getComponentStyles: () => ({
    background: '',
    text: '',
    mutedText: '',
    accentText: '',
    accentBg: '',
    borderColor: '',
    border: '',
    cardBg: '',
    hoverBg: '',
    glow: '',
    secondary: '',
  }),
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}))

// Mock supabase database helpers
jest.mock('@/lib/supabase/database', () => ({
  toggleLocationFavorite: jest.fn(),
  deleteSavedLocation: jest.fn(),
  getUserPreferences: jest.fn().mockResolvedValue(null),
}))

// Mock dashboard-weather
jest.mock('@/lib/dashboard-weather', () => ({
  getDashboardWeather: jest.fn().mockResolvedValue(null),
  getWeatherIcon: () => '☀',
  getTemperatureColor: () => '',
}))

import LocationCard from '@/components/dashboard/location-card'

const loc: SavedLocation = {
  id: 'loc-1',
  user_id: 'u1',
  location_name: 'Austin, TX',
  city: 'Austin',
  state: 'TX',
  country: 'US',
  latitude: 30.2672,
  longitude: -97.7431,
  is_favorite: false,
  custom_name: null,
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('LocationCard — parallel detailed-weather fetches', () => {
  it('starts all four detailed-weather fetches concurrently', async () => {
    const pending: Array<(v: unknown) => void> = []
    global.fetch = jest.fn(
      () => new Promise(r => { pending.push(r) })
    ) as jest.Mock

    render(<LocationCard location={loc} onUpdate={jest.fn()} />)
    fireEvent.click(screen.getByText(/Click for detailed weather/i))

    // All four calls must be in-flight before any resolves
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(4))

    const urls = (global.fetch as jest.Mock).mock.calls.map(c => String(c[0]))
    expect(urls.some(u => u.includes('/api/weather/current'))).toBe(true)
    expect(urls.some(u => u.includes('/api/weather/forecast'))).toBe(true)
    expect(urls.some(u => u.includes('/api/weather/uv'))).toBe(true)
    expect(urls.some(u => u.includes('/api/weather/air-quality'))).toBe(true)
  })

  it('degrades gracefully when optional fetches fail', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    global.fetch = jest.fn((url: unknown) => {
      const u = String(url)
      if (u.includes('/api/weather/current')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              main: { temp: 72, feels_like: 70, humidity: 50, pressure: 1013 },
              wind: { speed: 5 },
              weather: [{ description: 'clear sky', icon: '01d' }],
              visibility: 10000,
            }),
        })
      }
      if (u.includes('/api/weather/forecast')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ list: [] }),
        })
      }
      // UV: network rejection (optional)
      if (u.includes('/api/weather/uv')) {
        return Promise.reject(new Error('network error'))
      }
      // AQI: non-ok response (optional)
      if (u.includes('/api/weather/air-quality')) {
        return Promise.resolve({ ok: false })
      }
      return Promise.reject(new Error('unexpected url'))
    }) as jest.Mock

    render(<LocationCard location={loc} onUpdate={jest.fn()} />)
    fireEvent.click(screen.getByText(/Click for detailed weather/i))

    // Detailed view should render — UV and AQI both default to 0 / 'No Data'
    await waitFor(() => expect(screen.getByText(/UV Index: 0/i)).toBeDefined())
    await waitFor(() => expect(screen.getByText(/AQI: 0/i)).toBeDefined())

    // Required-fetch failures do NOT fire console.error when optional fetches fail
    expect(consoleError).not.toHaveBeenCalledWith(
      'Error fetching detailed weather:',
      expect.anything()
    )
  })

  it('aborts and logs when a required fetch fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    global.fetch = jest.fn((url: unknown) => {
      const u = String(url)
      // current: non-ok — required fetch failure
      if (u.includes('/api/weather/current')) {
        return Promise.resolve({ ok: false })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ list: [] }),
      })
    }) as jest.Mock

    render(<LocationCard location={loc} onUpdate={jest.fn()} />)
    fireEvent.click(screen.getByText(/Click for detailed weather/i))

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        'Error fetching detailed weather:',
        expect.anything()
      )
    )

    // No detailed weather data should be rendered
    expect(screen.queryByText(/UV Index/i)).toBeNull()
  })
})

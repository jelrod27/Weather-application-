/**
 * Unit tests for LocationCard component — detailed-weather fetch behaviour.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { SavedLocation } from '@/lib/supabase/types'

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}))

jest.mock('@/lib/supabase/database', () => ({
  toggleLocationFavorite: jest.fn(),
  deleteSavedLocation: jest.fn(),
  getUserPreferences: jest.fn().mockResolvedValue(null),
}))

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

const detailPayload = {
  current: {
    temperature: 72,
    feelsLike: 70,
    humidity: 50,
    windSpeed: 5,
    pressure: 1013,
    visibility: 10,
    description: 'clear sky',
    icon: '01d',
  },
  forecast: [],
  uvIndex: 7,
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('LocationCard — detailed-weather fetches', () => {
  it('starts detail and air-quality fetches concurrently', async () => {
    const pending: Array<(v: unknown) => void> = []
    global.fetch = jest.fn(
      () => new Promise((r) => {
        pending.push(r)
      }),
    ) as jest.Mock

    render(<LocationCard location={loc} onUpdate={jest.fn()} />)
    fireEvent.click(screen.getByText(/Click for detailed weather/i))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))

    const urls = (global.fetch as jest.Mock).mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.includes('/api/dashboard-weather') && u.includes('detail=1'))).toBe(
      true,
    )
    expect(urls.some((u) => u.includes('/api/weather/air-quality'))).toBe(true)
  })

  it('degrades gracefully when air-quality fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    global.fetch = jest.fn((url: unknown) => {
      const u = String(url)
      if (u.includes('/api/dashboard-weather')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...detailPayload, uvIndex: 0 }),
        })
      }
      if (u.includes('/api/weather/air-quality')) {
        return Promise.resolve({ ok: false })
      }
      return Promise.reject(new Error('unexpected url'))
    }) as jest.Mock

    render(<LocationCard location={loc} onUpdate={jest.fn()} />)
    fireEvent.click(screen.getByText(/Click for detailed weather/i))

    await waitFor(() => expect(screen.getByText(/UV Index: 0/i)).toBeDefined())
    await waitFor(() => expect(screen.getByText(/AQI: 0/i)).toBeDefined())

    expect(consoleError).not.toHaveBeenCalledWith(
      'Error fetching detailed weather:',
      expect.anything(),
    )
  })

  it('renders UV index from detail payload on successful fetch', async () => {
    global.fetch = jest.fn((url: unknown) => {
      const u = String(url)
      if (u.includes('/api/dashboard-weather')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(detailPayload),
        })
      }
      if (u.includes('/api/weather/air-quality')) {
        return Promise.resolve({ ok: false })
      }
      return Promise.reject(new Error('unexpected url'))
    }) as jest.Mock

    render(<LocationCard location={loc} onUpdate={jest.fn()} />)
    fireEvent.click(screen.getByText(/Click for detailed weather/i))

    await waitFor(() => expect(screen.getByText(/UV Index: 7/i)).toBeDefined())
  })

  it('aborts and logs when detail fetch fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    global.fetch = jest.fn((url: unknown) => {
      const u = String(url)
      if (u.includes('/api/dashboard-weather')) {
        return Promise.resolve({ ok: false })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ aqi: 1, category: 'Good' }),
      })
    }) as jest.Mock

    render(<LocationCard location={loc} onUpdate={jest.fn()} />)
    fireEvent.click(screen.getByText(/Click for detailed weather/i))

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        'Error fetching detailed weather:',
        expect.anything(),
      ),
    )

    expect(screen.queryByText(/UV Index/i)).toBeNull()
  })
})

// Dashboard-specific weather data fetching
// Simplified version of weather-api.ts for location cards

interface DashboardWeatherData {
  temperature: number
  description: string
  humidity: number
  windSpeed: number
  icon: string
  feelsLike: number
  pressure: number
  visibility: number
  units?: 'metric' | 'imperial'
}

export async function getDashboardWeather(
  latitude: number,
  longitude: number,
  units: 'metric' | 'imperial' = 'imperial'
): Promise<DashboardWeatherData | null> {
  try {
    const response = await fetch(
      `/api/dashboard-weather?lat=${latitude}&lon=${longitude}&units=${units}`,
      {
        cache: 'default',
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200'
        }
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Weather API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Data is already transformed by the API route
    return data
  } catch (error) {
    console.error('Error fetching dashboard weather:', error)
    return null
  }
}

export function getWeatherIcon(iconCode: string): string {
  const iconMap: { [key: string]: string } = {
    '01d': '☀️', // clear sky day
    '01n': '🌙', // clear sky night
    '02d': '⛅', // few clouds day
    '02n': '☁️', // few clouds night
    '03d': '☁️', // scattered clouds
    '03n': '☁️',
    '04d': '☁️', // broken clouds
    '04n': '☁️',
    '09d': '🌧️', // shower rain
    '09n': '🌧️',
    '10d': '🌦️', // rain day
    '10n': '🌧️', // rain night
    '11d': '⛈️', // thunderstorm
    '11n': '⛈️',
    '13d': '❄️', // snow
    '13n': '❄️',
    '50d': '🌫️', // mist
    '50n': '🌫️'
  }

  return iconMap[iconCode] || '🌤️'
}

export function getTemperatureColor(temp: number): string {
  // Use terminal weather semantic colors for hot/cold extremes
  // and semantic accent colors for mid-range temperatures
  if (temp >= 100) return 'text-terminal-weather-hot'
  if (temp >= 90) return 'text-terminal-accent-danger'
  if (temp >= 80) return 'text-orange-500'
  if (temp >= 70) return 'text-terminal-accent-warning'
  if (temp >= 60) return 'text-terminal-accent-success'
  if (temp >= 50) return 'text-terminal-accent-info'
  if (temp >= 40) return 'text-terminal-weather-cold'
  if (temp >= 32) return 'text-terminal-weather-cold'
  return 'text-terminal-weather-cold'
}
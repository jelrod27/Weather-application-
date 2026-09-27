import { calculateDarkWindow, calculateMoonInfo } from '@/lib/stargazer/astronomy'
import type { WeatherData } from '@/lib/types'

/** Server enrichment: use the same observing night and observer as Stargazer. */
export function getForecastMoonInfo(latitude: number, longitude: number, timeZone: string, at = new Date()): NonNullable<WeatherData['moonPhase']> {
  const night = calculateDarkWindow(latitude, longitude, at)
  const moon = calculateMoonInfo(latitude, longitude, night)
  const eventLabel = (date: Date): string => date.toLocaleString('en-US', {
    timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })
  const emoji = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'][Math.round(moon.phaseAngle / 45) % 8]
  return {
    phase: moon.phaseName, phaseAngle: moon.phaseAngle, illumination: Math.round(moon.illumination), emoji,
    nextFullMoon: eventLabel(moon.nextFullMoon),
    nextMoonset: moon.set ? eventLabel(moon.set) : 'No moonset in this observing period',
    moonsetAt: moon.set?.toISOString() ?? null,
    timeZone,
    observingNight: night.status === 'none' ? 'No dark observing window' : `Observing night of ${night.astronomicalDusk.toLocaleDateString('en-US', { timeZone, month: 'short', day: 'numeric' })}`,
  }
}

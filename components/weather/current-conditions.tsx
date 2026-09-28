import { Sun, Thermometer, Sunrise, Droplets, Gauge, Wind, CloudRain, Eye, Leaf, Navigation, ArrowDown, ArrowUp, Sunset } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MetricInfoTooltip } from '@/components/metric-info-tooltip'
import { PollenDisplay } from '@/components/pollen-display'
import { themeTokens } from '@/lib/theme-tokens'
import { DEFAULT_THEME, isLightTheme } from '@/lib/theme-config'
import { getTodayForecast } from '@/lib/weather/daily-forecast'
import { getFeelsLike } from '@/lib/weather/current-readings'
import { getUVSeverity, getHumiditySeverity, getPressureCategory, getWindSeverity, getVisibilitySeverity, windDirectionToDegrees, getSeverityTextColor } from '@/lib/weather-severity'
import type { ReactElement } from 'react'
import type { WeatherData } from '@/lib/types'
import type { ThemeType } from '@/lib/theme-config'

interface CurrentConditionsProps {
  weather: WeatherData
  theme: string
  precipitation?: { rain24h: number; snow24h: number } | null
}
const METRIC_CARD = 'weather-metric-card relative min-w-0 border border-border bg-card shadow-sm'

export function CurrentConditions({ weather, theme, precipitation }: CurrentConditionsProps): ReactElement {
  const themeClasses = themeTokens.weather
  const uvValue = Number.isFinite(weather.uvIndex) ? weather.uvIndex : null
  const humidityValue = Number.isFinite(weather.humidity) ? weather.humidity : null
  const windValue = Number.isFinite(weather.wind?.speed) ? weather.wind.speed : null
  const unavailable = { label: 'Unavailable', textColor: 'hsl(var(--muted-foreground))', bgColor: '#94a3b8', percentage: 0 }
  const uvSeverity = uvValue === null ? unavailable : getUVSeverity(uvValue)
  const humiditySeverity = humidityValue === null ? unavailable : getHumiditySeverity(humidityValue)
  const hasPressure = Number.isFinite(parseFloat(weather.pressure))
  const precipitationTotal = precipitation && Number.isFinite(precipitation.rain24h) && Number.isFinite(precipitation.snow24h)
    ? precipitation.rain24h + precipitation.snow24h : null
  const pressureCategory = hasPressure ? getPressureCategory(weather.pressure) : unavailable
  const windUnit = weather.unit === '°C' ? 'km/h' : 'mph'
  const windSeverity = windValue === null ? unavailable : getWindSeverity(windValue, windUnit)
  const windDeg = windDirectionToDegrees(weather.wind?.direction || '')
  const visibilityMi = getTodayForecast(weather)?.details?.visibility
  const visibilitySeverity = visibilityMi != null && Number.isFinite(visibilityMi) ? getVisibilitySeverity(visibilityMi) : null
  const { feelsLike, feelsLikeDelta } = getFeelsLike(weather)
  const deltaWarmClass = isLightTheme(theme) ? 'text-rose-700' : 'text-rose-400'
  const deltaSameClass = isLightTheme(theme) ? 'text-emerald-800' : 'text-emerald-400'
  const severityText = (color: string): string => getSeverityTextColor(color, isLightTheme(theme))
  return <section aria-label="Current conditions">
    <h2 className="mb-4 text-xl font-semibold text-foreground">Current conditions</h2>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

        {/* UV Index */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '30ms' }}>
          <MetricInfoTooltip metricId="uv-index" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Sun size={14} className="text-primary group-hover:text-accent transition-colors" />
              UV Index
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <p className={cn("text-3xl font-bold tabular-nums", themeClasses.text)}>
              {uvValue ?? 'N/A'}
            </p>
            <Badge
              variant="outline"
              className="mt-2 border-0"
              style={{ color: severityText(uvSeverity.textColor), backgroundColor: `${uvSeverity.bgColor}20` }}
            >
              {uvSeverity.label}
            </Badge>
            {uvValue != null && <Progress
              aria-label="UV index severity"
              aria-valuetext={`UV index ${uvValue}, ${uvSeverity.label}`}
              value={uvSeverity.percentage}
              className="h-1.5 mt-3"
              indicatorColor={uvSeverity.bgColor}
            />}
          </CardContent>
        </Card>

        {/* Feels Like */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '60ms' }}>
          <MetricInfoTooltip metricId="feels-like" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Thermometer size={14} className="text-primary group-hover:text-accent transition-colors" />
              Feels Like
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <p className={cn("text-3xl font-bold tabular-nums", themeClasses.text)}>
              {feelsLike != null ? `${feelsLike}°` : 'Unavailable'}
            </p>
            {feelsLike != null && feelsLikeDelta != null && feelsLikeDelta !== 0 && (
              <div className="flex items-center justify-center gap-1 mt-2">
                {feelsLikeDelta < 0 ? (
                  <ArrowDown size={14} className="text-primary" />
                ) : (
                  <ArrowUp size={14} className={deltaWarmClass} />
                )}
                <span className={cn(
                  "text-sm",
                  feelsLikeDelta < 0 ? "text-primary" : deltaWarmClass,
                )}>
                  {Math.abs(feelsLikeDelta)}° {feelsLikeDelta < 0 ? 'cooler' : 'warmer'}
                </span>
              </div>
            )}
            {feelsLike != null && feelsLikeDelta === 0 && (
              <p className={cn("text-sm mt-2", deltaSameClass)}>Same as actual</p>
            )}
          </CardContent>
        </Card>

        {/* Sun Times */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '90ms' }}>
          <MetricInfoTooltip metricId="sun-times" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Sun size={14} className="text-primary group-hover:text-accent transition-colors" />
              Sun Times
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-4 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-center flex-1">
                <Sunrise size={20} className="mx-auto mb-1 text-amber-500" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Rise</p>
                <p className={cn("text-lg font-bold tabular-nums", themeClasses.text)}>
                  {weather?.sunrise || 'N/A'}
                </p>
              </div>
              <div className="flex flex-col items-center px-1">
                <div className="w-12 h-[2px] bg-gradient-to-r from-amber-500 via-yellow-300 to-orange-500 rounded-full" />
              </div>
              <div className="text-center flex-1">
                <Sunset size={20} className="mx-auto mb-1 text-orange-500" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Set</p>
                <p className={cn("text-lg font-bold tabular-nums", themeClasses.text)}>
                  {weather?.sunset || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Humidity */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '120ms' }}>
          <MetricInfoTooltip metricId="humidity" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Droplets size={14} className="text-primary group-hover:text-accent transition-colors" />
              Humidity
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <p className={cn("text-3xl font-bold tabular-nums", themeClasses.text)}>
              {humidityValue != null ? `${humidityValue}%` : 'N/A'}
            </p>
            {humidityValue != null && <Progress
              aria-label="Humidity"
              value={humidityValue}
              className="h-1.5 mt-3"
              indicatorColor={humiditySeverity.bgColor}
            />}
            <Badge
              variant="outline"
              className="mt-2 border-0"
              style={{ color: severityText(humiditySeverity.textColor), backgroundColor: `${humiditySeverity.bgColor}20` }}
            >
              {humiditySeverity.label}
            </Badge>
          </CardContent>
        </Card>

        {/* Pressure */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '150ms' }}>
          <MetricInfoTooltip metricId="pressure" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Gauge size={14} className="text-primary group-hover:text-accent transition-colors" />
              Pressure
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <p className={cn("text-3xl font-bold tabular-nums", themeClasses.text)}>
              {hasPressure ? weather.pressure : 'N/A'}
            </p>
            <Badge
              variant="outline"
              className="mt-2 border-0"
              style={{ color: severityText(pressureCategory.textColor), backgroundColor: `${pressureCategory.bgColor}20` }}
            >
              {pressureCategory.label}
            </Badge>
          </CardContent>
        </Card>

        {/* Wind */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '180ms' }}>
          <MetricInfoTooltip metricId="wind" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Wind size={14} className="text-primary group-hover:text-accent transition-colors" />
              Wind
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <p className={cn("text-3xl font-bold tabular-nums", themeClasses.text)}>
              {windValue ?? 'N/A'} <span className="text-lg">{windUnit}</span>
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              {weather?.wind?.direction && (
                <Navigation
                  size={16}
                  className="text-primary"
                  style={{ transform: `rotate(${windDeg + 180}deg)` }}
                />
              )}
              <span className={cn("text-sm", themeClasses.secondaryText)}>
                {weather?.wind?.direction || 'N/A'}
              </span>
            </div>
            {weather.wind?.gust != null && Number.isFinite(weather.wind.gust) && (
              <p className={cn("text-xs mt-1", themeClasses.secondaryText)}>
                Gusts {weather.wind.gust} {windUnit}
              </p>
            )}
            <Badge
              variant="outline"
              className="mt-2 border-0"
              style={{ color: severityText(windSeverity.textColor), backgroundColor: `${windSeverity.bgColor}20` }}
            >
              {windSeverity.label}
            </Badge>
          </CardContent>
        </Card>



        {/* Precipitation */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '210ms' }}>
          <MetricInfoTooltip metricId="precipitation" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <CloudRain size={14} className="text-primary group-hover:text-accent transition-colors" />
              Precipitation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <p className={cn("text-3xl font-bold tabular-nums", themeClasses.text)}>
              {precipitationTotal != null
                ? `${precipitationTotal.toFixed(2)}"`
                : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">24h Total</p>
          </CardContent>
        </Card>

        {/* Visibility */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '240ms' }}>
          <MetricInfoTooltip metricId="visibility" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Eye size={14} className="text-primary group-hover:text-accent transition-colors" />
              Visibility
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <p className={cn("text-3xl font-bold tabular-nums", themeClasses.text)}>
              {visibilitySeverity
                ? <>{visibilityMi}<span className="text-lg ml-1">mi</span></>
                : 'N/A'}
            </p>
            <Badge
              variant="outline"
              className="mt-2 border-0"
              style={visibilitySeverity ? { color: severityText(visibilitySeverity.textColor), backgroundColor: `${visibilitySeverity.bgColor}20` } : undefined}
            >
              {visibilitySeverity?.label ?? 'Unavailable'}
            </Badge>
          </CardContent>
        </Card>

        {/* Pollen */}
        <Card className={cn(METRIC_CARD, "relative")} style={{ animationDelay: '270ms' }}>
          <MetricInfoTooltip metricId="pollen" />
          <CardHeader className="pb-2 pt-4 px-4 text-center">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Leaf size={14} className="text-primary group-hover:text-accent transition-colors" />
              Pollen
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-4 pb-4">
            <PollenDisplay
              pollen={weather.pollen}
              theme={(theme || DEFAULT_THEME) as ThemeType}
              minimal={true}
              className="border-none shadow-none p-0 bg-transparent"
            />
          </CardContent>
        </Card>

    </div>
  </section>
}

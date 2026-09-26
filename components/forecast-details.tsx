import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Droplets, Wind, Eye, Gauge, Sunrise, Sunset, Info } from "lucide-react"
import type { ThemeType } from "@/lib/theme-config"
import type { ForecastDay } from "@/lib/types"

interface ForecastDetailsProps {
  forecast: ForecastDay[];
  tempUnit?: string;
  theme?: ThemeType; // Kept for api compatibility
  selectedDay: number | null;
}

export default function ForecastDetails({
  forecast,
  selectedDay,
  tempUnit = '°F'
}: ForecastDetailsProps) {
  // Don't render anything if no day is selected
  if (selectedDay === null || !forecast[selectedDay]) {
    return null;
  }

  return (
    <Card className="p-3 sm:p-4 lg:p-6 border-0 shadow-xl animate-slide-in">
      <CardHeader className="p-0 mb-3 sm:mb-4">
        <CardTitle className="text-center text-base sm:text-lg lg:text-xl font-bold uppercase tracking-wider text-primary glow">
          DETAILED FORECAST
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="bg-muted/50 p-4 rounded-lg border-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-primary pixel-glow">
                {forecast[selectedDay].day}
              </h3>
              <p className="text-sm text-foreground capitalize">
                {forecast[selectedDay].description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-primary pixel-glow">
                {Math.round(forecast[selectedDay].highTemp)}{tempUnit} / {Math.round(forecast[selectedDay].lowTemp)}{tempUnit}
              </div>
            </div>
          </div>

          <DetailedWeatherInfo
            windUnit={tempUnit === '°C' ? 'km/h' : 'mph'}
            forecastDay={forecast[selectedDay]}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DetailedWeatherInfo({ forecastDay, windUnit }: {
  forecastDay: ForecastDay;
  windUnit: string;
}) {
  const dayDetails = forecastDay.details;

  const weatherMetrics = [
    {
      icon: <Droplets className="w-4 h-4" />,
      label: "Chance of Rain",
      value: dayDetails?.precipitationChance != null ? `${dayDetails.precipitationChance}%` : "Unavailable"
    },
    {
      icon: <Droplets className="w-4 h-4" />,
      label: "Humidity",
      value: dayDetails?.humidity != null ? `${dayDetails.humidity}%` : "Unavailable",
      tooltip: "Relative humidity measures the amount of moisture in the air as a percentage of the maximum moisture the air can hold at the current temperature."
    },
    {
      icon: <Wind className="w-4 h-4" />,
      label: "Wind",
      value: dayDetails?.windSpeed != null ?
        `${dayDetails.windSpeed} ${windUnit} ${dayDetails.windDirection || ''}` :
        "Unavailable"
    },
    {
      icon: <Gauge className="w-4 h-4" />,
      label: "Pressure",
      value: dayDetails?.pressure || "Unavailable",
      tooltip: "Barometric pressure measures the weight of the atmosphere pressing down on Earth's surface. It's measured in inches of mercury (inHg) or hectopascals (hPa)."
    },
    {
      icon: <Eye className="w-4 h-4" />,
      label: "UV Index",
      value: dayDetails?.uvIndex != null ? dayDetails.uvIndex.toString() : "Unavailable"
    }
  ];

  // Solar events belong to the selected forecast day.
  if (forecastDay.sunrise || forecastDay.sunset) {
    weatherMetrics.push(
      {
        icon: <Sunrise className="w-4 h-4" />,
        label: "Sunrise",
        value: forecastDay.sunrise || "Unavailable"
      },
      {
        icon: <Sunset className="w-4 h-4" />,
        label: "Sunset",
        value: forecastDay.sunset || "Unavailable"
      }
    );
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {weatherMetrics.map((metric, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className="text-primary flex-shrink-0">
              {metric.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {metric.label}
                {(metric as { tooltip?: string }).tooltip && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 cursor-help opacity-60 hover:opacity-100 transition-opacity" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      <p>{(metric as { tooltip?: string }).tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="text-sm font-medium text-foreground truncate">
                {metric.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
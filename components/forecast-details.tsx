import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Droplets, Wind, Eye, Gauge, Sunrise, Sunset, Info } from "lucide-react"
import type { ThemeType } from "@/lib/theme-config"
import type { ForecastDay } from "@/lib/types"

interface ForecastDetailsProps {
  forecast: ForecastDay[];
  theme?: ThemeType; // Kept for api compatibility
  selectedDay: number | null;
  currentWeatherData?: {
    humidity: number;
    wind: { speed: number; direction?: string };
    pressure: string;
    uvIndex: number;
    sunrise: string;
    sunset: string;
  };
}

export default function ForecastDetails({
  forecast,
  selectedDay,
  currentWeatherData
}: ForecastDetailsProps) {
  // Don't render anything if no day is selected
  if (selectedDay === null) {
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
                {Math.round(forecast[selectedDay].highTemp)}° / {Math.round(forecast[selectedDay].lowTemp)}°
              </div>
            </div>
          </div>

          <DetailedWeatherInfo
            selectedDay={selectedDay}
            forecastDay={forecast[selectedDay]}
            currentWeatherData={currentWeatherData}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DetailedWeatherInfo({
  selectedDay,
  forecastDay,
  currentWeatherData
}: {
  selectedDay: number;
  forecastDay: ForecastDay & {
    details?: {
      humidity?: number;
      windSpeed?: number;
      windDirection?: string;
      pressure?: string;
      uvIndex?: number;
      precipitationChance?: number;
      cloudCover?: number;
      visibility?: number;
    };
  };
  currentWeatherData?: {
    humidity: number;
    wind: { speed: number; direction?: string };
    pressure: string;
    uvIndex: number;
    sunrise: string;
    sunset: string;
  };
}) {
  // Use forecast day details first, fallback to current weather for today
  const isToday = selectedDay === 0;
  const dayDetails = forecastDay?.details;

  const weatherMetrics = [
    {
      icon: <Droplets className="w-4 h-4" />,
      label: "Chance of Rain",
      value: dayDetails?.precipitationChance !== undefined ? `${dayDetails.precipitationChance}%` : "0%"
    },
    {
      icon: <Droplets className="w-4 h-4" />,
      label: "Humidity",
      value: dayDetails?.humidity !== undefined ? `${dayDetails.humidity}%` :
        (isToday && currentWeatherData?.humidity ? `${currentWeatherData.humidity}%` : "N/A"),
      tooltip: "Relative humidity measures the amount of moisture in the air as a percentage of the maximum moisture the air can hold at the current temperature."
    },
    {
      icon: <Wind className="w-4 h-4" />,
      label: "Wind",
      value: dayDetails?.windSpeed !== undefined ?
        `${dayDetails.windSpeed} mph ${dayDetails.windDirection || ''}` :
        (isToday && currentWeatherData?.wind ?
          `${Math.round(currentWeatherData.wind.speed)} mph ${currentWeatherData.wind.direction || ''}` :
          "N/A")
    },
    {
      icon: <Gauge className="w-4 h-4" />,
      label: "Pressure",
      value: dayDetails?.pressure ||
        (isToday && currentWeatherData?.pressure ? currentWeatherData.pressure : "N/A"),
      tooltip: "Barometric pressure measures the weight of the atmosphere pressing down on Earth's surface. It's measured in inches of mercury (inHg) or hectopascals (hPa)."
    },
    {
      icon: <Eye className="w-4 h-4" />,
      label: "UV Index",
      value: dayDetails?.uvIndex !== undefined ? dayDetails.uvIndex.toString() :
        (isToday && currentWeatherData?.uvIndex !== undefined ? currentWeatherData.uvIndex.toString() : "N/A")
    }
  ];

  // Show sunrise/sunset for all days (values are similar daily)
  if (currentWeatherData?.sunrise || currentWeatherData?.sunset) {
    weatherMetrics.push(
      {
        icon: <Sunrise className="w-4 h-4" />,
        label: "Sunrise",
        value: currentWeatherData.sunrise || "N/A"
      },
      {
        icon: <Sunset className="w-4 h-4" />,
        label: "Sunset",
        value: currentWeatherData.sunset || "N/A"
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
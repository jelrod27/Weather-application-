"use client"

import dynamic from 'next/dynamic'
import { Loader2 } from "lucide-react"
import type { HourlyForecastData } from './hourly-forecast'
import type { ThemeType } from '@/lib/theme-config'

const HourlyForecast = dynamic(() => import('./hourly-forecast'), {
  loading: () => (
    <div className="flex items-center justify-center p-8 bg-terminal-bg-secondary border-0 rounded-lg">
      <Loader2 className="w-8 h-8 animate-spin text-terminal-accent" />
      <span className="ml-3 text-terminal-accent">Loading hourly forecast...</span>
    </div>
  ),
  ssr: false
})

interface LazyHourlyForecastProps {
  hourly: HourlyForecastData[];
  theme?: ThemeType;
  tempUnit?: string;
}

export default function LazyHourlyForecast(props: LazyHourlyForecastProps) {
  return <HourlyForecast {...props} />
}

'use client';

import { useEffect, useState } from 'react';
import { ArrowDownRight } from 'lucide-react';
import { formatLocationTimeWithZone } from '@/lib/format-location-time';
import { cn } from '@/lib/utils';
import { getOutdoorPlan } from '@/lib/weather/outdoor-windows';
import type { WeatherData } from '@/lib/types';
import type { OutdoorDay, OutdoorDuration, WindowPriority } from '@/lib/weather/outdoor-windows';

interface OutdoorPlannerProps {
  weather: Pick<WeatherData, 'location' | 'unit' | 'timezone' | 'hourlyForecast'>;
  onSelectHour: (timestamp: number) => void;
}

const CONTROL = 'min-h-11 rounded-md border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const UNAVAILABLE = {
  timezone: 'The location’s time zone is unavailable. Search for the city again to compare local times.',
  units: 'Forecast units are unavailable. Refresh the forecast before comparing outings.',
  forecast: 'Recent hourly readings are unavailable. Refresh the forecast or choose another location.',
};

/** Compare existing hourly readings with explicit tradeoffs and a direct route to their details. */
export function OutdoorPlanner({ weather, onSelectHour }: OutdoorPlannerProps): React.JSX.Element {
  const [day, setDay] = useState<OutdoorDay>('today');
  const [duration, setDuration] = useState<OutdoorDuration>(2);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = (): void => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const plan = now === null ? null : getOutdoorPlan(weather, { now, day, duration });
  const windUnit = weather.unit === '°C' ? 'km/h' : 'mph';
  const targetTemperature = weather.unit === '°C' ? '20°C' : '68°F';
  const titles: Record<WindowPriority, string> = {
    precipitation: 'Lower precipitation chance', wind: 'Lighter wind', temperature: `Closer to ${targetTemperature}`,
  };
  const explanations: Record<WindowPriority, string> = {
    precipitation: 'The lowest peak hourly chance of rain or snow among the available periods.',
    wind: 'The lowest peak hourly wind among the remaining, non-overlapping periods.',
    temperature: `Readings closest to ${targetTemperature} among the remaining, non-overlapping periods.`,
  };
  const date = plan?.status === 'ready' ? new Date(`${plan.date}T12:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric',
  }) : '';

  return (
    <section id="outdoor-planner" aria-labelledby="outdoor-planner-title" className="scroll-mt-24 rounded-xl border border-border bg-card p-4 sm:p-6">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Make a little room for outside · {weather.location}</p>
      <h2 id="outdoor-planner-title" className="mt-2 text-2xl font-semibold tracking-tight">Plan time outdoors</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Compare rain or snow chances, wind and temperature before choosing your time.</p>
      <div className="my-5 flex flex-wrap gap-x-8 gap-y-4">
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-muted-foreground">Outing day</legend>
          <div className="flex gap-2">{(['today', 'tomorrow'] as const).map(value => (
            <button key={value} type="button" aria-pressed={day === value} onClick={() => setDay(value)} className={cn(CONTROL, day === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-muted')}>
              {value === 'today' ? 'Today' : 'Tomorrow'}
            </button>
          ))}</div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-muted-foreground">Time outside</legend>
          <div className="flex gap-2">{([1, 2] as const).map(value => (
            <button key={value} type="button" aria-pressed={duration === value} onClick={() => setDuration(value)} className={cn(CONTROL, duration === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-muted')}>
              {value} {value === 1 ? 'hour' : 'hours'}
            </button>
          ))}</div>
        </fieldset>
      </div>
      <p role="status" aria-live="polite" aria-atomic="true" className="mb-4 text-sm text-muted-foreground">
        {!plan ? 'Preparing outdoor comparisons…' : plan.status === 'unavailable' ? UNAVAILABLE[plan.reason]
          : plan.windows.length ? `${date} · ${plan.windows.length} ${duration}-hour options · times local to ${weather.location}`
            : `No complete future ${duration}-hour windows between 6 AM and 9 PM for ${date}. Try another day or a shorter outing, or check the hourly forecast below.`}
      </p>
      {plan?.status === 'ready' && <>
        {plan.excludedHazards && <p className="mb-4 text-sm text-muted-foreground">Some periods were omitted because the forecast includes thunderstorms, freezing conditions or heavy precipitation.</p>}
        <div className="grid gap-4 md:grid-cols-3">
          {plan.windows.map(option => (
            <article key={option.start} aria-label={titles[option.priority]} className="flex flex-col rounded-lg border border-border bg-background/60 p-4">
              <h3 className="text-sm font-semibold text-primary">{titles[option.priority]}</h3>
              <p className="mt-2 text-lg font-semibold tracking-tight">{formatLocationTimeWithZone(option.start * 1000, weather.timezone)} – {formatLocationTimeWithZone(option.end * 1000, weather.timezone)}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{explanations[option.priority]}</p>
              <dl className="my-4 space-y-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">Temperature</dt><dd className="font-semibold tabular-nums">{Math.round(option.temperature.low) === Math.round(option.temperature.high) ? Math.round(option.temperature.low) : `${Math.round(option.temperature.low)}–${Math.round(option.temperature.high)}`}{weather.unit}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Highest hourly chance</dt><dd className="font-semibold tabular-nums">{Math.round(option.precipitationHigh)}%</dd></div>
                <div><dt className="text-xs text-muted-foreground">Hourly wind up to</dt><dd className="font-semibold tabular-nums">{Math.round(option.windHigh)} {windUnit}</dd></div>
              </dl>
              <a href="#selected-hour-details" onClick={() => onSelectHour(option.start)} className="mt-auto inline-flex min-h-11 items-center gap-2 rounded text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">View hourly readings <ArrowDownRight size={16} aria-hidden="true" /></a>
            </article>
          ))}
        </div>
      </>}
      <details className="mt-5 text-sm text-muted-foreground">
        <summary className="min-h-11 cursor-pointer rounded py-3 font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring">How these comparisons work</summary>
        <div className="space-y-2 leading-relaxed">
          <p>We compare complete future periods between 6 AM and 9 PM in this city’s time zone. These clock hours do not guarantee daylight.</p>
          <p>First we choose lower precipitation chance, then lighter wind, then temperatures closer to {targetTemperature} from the remaining periods. Equal readings favor the earlier time. Each period is distinct; {targetTemperature} is a comparison preference, not a comfort or safety threshold.</p>
          <p>Precipitation is the highest individual hourly chance of rain or snow, not the probability for the whole outing. Temperature and wind include readings at both ends of the outing; wind gusts are not included.</p>
          <p>Missing readings and periods that have already started are excluded. Comparisons use the available forecast and do not establish when the provider last updated it.</p>
          <p>Source: <a href="https://open-meteo.com/en/docs#hourly-parameter-definition" target="_blank" rel="noopener noreferrer" className="underline text-primary">Open-Meteo hourly forecasts</a>.</p>
        </div>
      </details>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Check alerts and local conditions before heading out. These comparisons cover temperature, wind and precipitation only; weather can change.</p>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStargazerUnits } from '@/hooks/useStargazerUnits';
import { formatObservingTime, getStargazerHref } from '@/lib/stargazer/context';
import { selectBeginnerHour } from '@/lib/stargazer/beginner-selection';
import { getBeginnerTarget } from '@/lib/stargazer/beginner-targets';
import SkyFindingDiagram from '@/components/stargazer/SkyFindingDiagram';
import SkyLessons from '@/components/stargazer/SkyLessons';
import { getStargazerFreshness } from '@/lib/stargazer/freshness';
import { getWeatherJourneyLinks } from '@/lib/weather/journey';
import type { StargazerContext, StargazerEquipment } from '@/lib/stargazer/context';
import type { StargazerTabId } from '@/components/stargazer/StargazerNav';
import type { StargazerData } from '@/lib/stargazer/types';
import type { ObservingWeatherIssue } from '@/lib/stargazer/beginner-types';

interface BeginnerPanelProps {
  data: StargazerData;
  context: StargazerContext;
  now: number;
  receivedAt: number | null;
  onTabChange: (tab: StargazerTabId) => void;
  onContextChange: (change: Pick<StargazerContext, 'at' | 'equipment'>) => void;
}
const EQUIPMENT: { value: StargazerEquipment; label: string }[] = [
  { value: 'eyes', label: 'Just my eyes' }, { value: 'binoculars', label: 'Binoculars' }, { value: 'telescope', label: 'Small telescope' },
];
const WEATHER_MESSAGES: Record<ObservingWeatherIssue, string> = {
  missing: 'Some required weather readings are unavailable for this full hour.',
  clouds: 'Cloud cover reaches our 75% cutoff for suggestions.',
  precipitation: 'Rain or snow chance reaches our 50% cutoff for suggestions.',
  'weather-code': 'The forecast includes freezing, heavy precipitation or storm conditions that we exclude from suggestions.',
};

export default function BeginnerPanel({ data, context, now, receivedAt, onContextChange, onTabChange }: BeginnerPanelProps): React.JSX.Element {
  const units = useStargazerUnits();
  const night = data.beginnerNight ?? { hours: [] };
  const selection = selectBeginnerHour(night, context.equipment, context.at, now);
  const { selected, suggested, targets } = selection;
  const stale = getStargazerFreshness(data.weatherRetrievedAt, receivedAt, now).stale;
  const [notice, setNotice] = useState('');
  const invalidTime = context.invalidTime === true;
  useEffect(() => {
    if (selection.replacedSelection || invalidTime) setNotice(selected
      ? 'The shared hour was invalid, expired or outside this observing night and has been replaced.'
      : 'The shared hour is no longer available. No replacement is available; refresh or browse the learning guides.');
    if (selected && context.at !== selected.start) onContextChange({ at: selected.start, equipment: context.equipment });
  }, [selected, context.at, context.equipment, invalidTime, selection.replacedSelection, onContextChange]);
  const links = getWeatherJourneyLinks({ location: context.label, coordinates: data.location, timezone: data.location.timezone });
  const viewingContext: StargazerContext = { ...context, at: selected?.start ?? null, from: 'start' };
  const affirmative = !stale && selected && selected.weather.issues.length === 0 && targets.length > 0;
  const heading = stale || !data.beginnerNight ? 'Refresh to plan this night' : !selected ? 'No complete future hour available'
    : affirmative ? 'Try this hour' : 'Inspect this hour';
  return <div className="space-y-5">
    <section className="container-primary p-4 sm:p-6 space-y-4" aria-labelledby="beginner-hour-heading">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-primary font-semibold">Tonight in {context.label || `${data.location.lat.toFixed(2)}, ${data.location.lon.toFixed(2)}`}</p>
        <h2 id="beginner-hour-heading" className="text-xl sm:text-2xl font-bold">{heading}</h2>
        <p className="text-sm text-muted-foreground">Start with a time and the equipment you have. These are things to look for, with no guarantee of visibility.</p>
      </div>
      {notice && <p role="status" className="text-sm border-l-2 border-primary pl-3">{notice}</p>}
      {stale && <p className="text-sm">Use Refresh forecast above before relying on a suggested hour. Positions below are a sky reference.</p>}
      {night.reason === 'timezone' && <p>Local time zone unavailable. Try another location or refresh before planning a night.</p>}
      {!selected && <p>No complete future one-hour period is available in this forecast. Refresh or browse the learning guides below.</p>}
      {data.darkWindow.status === 'none' && <p className="text-sm">No astronomical darkness this night. The Moon or bright planets may still qualify after civil twilight; faint-object suggestions need darker skies.</p>}
      {data.darkWindow.status === 'continuous' && <p className="text-sm">Continuous astronomical darkness: comparing the next 24 hours.</p>}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold mb-2">Your equipment</legend>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map(option => <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm ${context.equipment === option.value ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
            <input type="radio" name="stargazer-equipment" value={option.value} checked={context.equipment === option.value}
              onChange={() => { setNotice(''); onContextChange({ at: selected?.start ?? null, equipment: option.value }); }} className="accent-[var(--primary)]" />
            {option.label}
          </label>)}
        </div>
      </fieldset>
      {selected && <>
        <div className="space-y-2">
          <label htmlFor="observing-hour" className="block text-sm font-semibold">Observing hour</label>
          <select id="observing-hour" value={selected.start} className="w-full rounded border border-border bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
            onChange={event => { setNotice(''); onContextChange({ at: Number(event.target.value), equipment: context.equipment }); }}>
            {selection.hours.map(hour => <option key={hour.start} value={hour.start}>{formatObservingTime(hour.start, context.timeZone)} – {formatObservingTime(hour.end, context.timeZone)}</option>)}
          </select>
          <p className="text-sm">Selected interval: {formatObservingTime(selected.start, context.timeZone)} – {formatObservingTime(selected.end, context.timeZone)}</p>
          {suggested?.start === selected.start && affirmative && <p className="text-sm text-muted-foreground">Lowest maximum cloud cover among qualifying hours; ties favor lower precipitation chance, lower wind, then the earlier hour.</p>}
          {suggested && suggested.start !== selected.start && !stale && <button type="button" className="text-sm text-primary underline" onClick={() => onContextChange({ at: suggested.start, equipment: context.equipment })}>Use suggested hour: {formatObservingTime(suggested.start, context.timeZone)}</button>}
        </div>
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Cloud cover</dt><dd className="font-semibold mt-1">{selected.weather.cloudLow === null ? 'Unavailable' : `${Math.round(selected.weather.cloudLow)}–${Math.round(selected.weather.cloudHigh!)}%`}</dd></div>
          <div className="rounded bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Temperature</dt><dd className="font-semibold mt-1">{units.temperature(selected.weather.temperatureLow)} – {units.temperature(selected.weather.temperatureHigh)}</dd></div>
          <div className="rounded bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Highest sampled wind</dt><dd className="font-semibold mt-1">{units.wind(selected.weather.wind)}</dd></div>
          <div className="rounded bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Rain or snow this hour</dt><dd className="font-semibold mt-1">{selected.weather.precipitation === null ? 'Unavailable' : `${Math.round(selected.weather.precipitation)}% chance`}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">Hourly weather samples bracket this full hour. Cloud cover is an area forecast; it cannot confirm a clear view in a particular direction.</p>
        {selected.weather.issues.length > 0 && <div role="status" className="rounded border border-border p-3 text-sm space-y-1">
          {selected.weather.issues.map(issue => <p key={issue}>{WEATHER_MESSAGES[issue]}</p>)}
          <p>These conservative planning cutoffs are not a safety assessment or scientific visibility limits.</p>
        </div>}
        {!suggested && !stale && <p className="text-sm">No suggested hour meets the weather, equipment and target-height rules in this forecast.</p>}
      </>}
    </section>
    {selected && <section className="space-y-3" aria-labelledby="beginner-targets-heading">
      <div><h2 id="beginner-targets-heading" className="text-lg font-bold">{affirmative ? 'Things to try' : 'Calculated sky positions'}</h2>
        <p className="text-sm text-muted-foreground">Where to look at {formatObservingTime(selected.midpoint, context.timeZone)} — the midpoint of your hour.</p></div>
      {!targets.length && <p className="container-primary p-4 text-sm">No reviewed targets meet the darkness, Moon, height and equipment rules at this hour. Try another hour or equipment, or explore the catalog.</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {targets.map(position => {
          const target = getBeginnerTarget(position.id)!;
          return <article key={position.id} className="container-primary p-4 flex flex-col gap-3">
            <div><p className="text-xs uppercase text-muted-foreground">{target.kind === 'deep-sky' ? position.id : target.kind}</p><h3 className="text-lg font-bold text-primary">{target.name}</h3></div>
            <p className="text-sm">{target.appearance}</p>
            <SkyFindingDiagram position={position} />
            <p className="text-sm text-muted-foreground">{target.guidance}</p>
            <p className="text-xs">{affirmative ? 'Above the horizon throughout the sampled hour.' : stale ? 'Position reference; refresh weather before planning.' : 'A target to try if skies clear.'}</p>
            {target.kind === 'deep-sky' ? <Link href={getStargazerHref(viewingContext, { objectId: target.id })} className="mt-auto text-primary text-sm underline">Finding guide for {target.name}</Link>
              : <a href={target.source.url} className="mt-auto text-primary text-sm underline">NASA viewing guide for {target.name}</a>}
          </article>;
        })}
      </div>
      <p className="text-xs text-muted-foreground">True north, not a phone compass. Positions are checked every 15 minutes; objects move during the hour. Trees, buildings, terrain and local light pollution are not modeled. A bright Moon above the horizon limits our faint-target suggestions.</p>
    </section>}
    <SkyLessons />
    <nav aria-label="Explore more stargazing and weather" className="container-primary p-4 flex flex-wrap gap-x-5 gap-y-3 text-sm">
      <Link className="text-primary underline" href={getStargazerHref(viewingContext, { catalog: true })}>Browse the full catalog</Link>
      <a className="text-primary underline" href={getStargazerHref(viewingContext, { tab: 'conditions' })} onClick={event => {
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); onTabChange('conditions'); }
      }}>Detailed conditions</a>
      <a className="text-primary underline" href={getStargazerHref(viewingContext, { tab: 'targets' })} onClick={event => {
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); onTabChange('targets'); }
      }}>All targets</a>
      <Link className="text-primary underline" href={links.hourly}>Hourly weather</Link>
      <Link className="text-primary underline" href={links.radar}>Radar</Link>
    </nav>
  </div>;
}

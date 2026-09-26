'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SkyFindingDiagram from '@/components/stargazer/SkyFindingDiagram';
import { catalogObjectAltAz } from '@/lib/stargazer/astronomy';
import { formatObservingTime, getStargazerHref, readStargazerContext } from '@/lib/stargazer/context';
import type { ReactNode } from 'react';

interface TonightVisibilityProps { ra: number; dec: number; objectName: string }

export default function TonightVisibility({ ra, dec, objectName }: TonightVisibilityProps): ReactNode {
  const context = readStargazerContext(useSearchParams());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const coordinates = context.coordinates;
  if (!coordinates) return <section className="container-primary p-4 space-y-2">
    <h2 className="font-semibold">How to find {objectName}</h2>
    <p>Choose a location to calculate where to look.</p>
    <Link className="text-primary underline" href={getStargazerHref(context)}>Choose an observing location</Link>
  </section>;
  const selected = context.at !== null && context.at >= now && context.at <= now + 86400000;
  const instant = selected ? context.at! + 1800000 : now;
  const position = catalogObjectAltAz(ra, dec, coordinates.lat, coordinates.lon, new Date(instant));
  return <section className="container-primary p-4 space-y-2">
    <h2 className="font-semibold">How to find {objectName}</h2>
    <p>{context.label || `${coordinates.lat}, ${coordinates.lon}`} · {formatObservingTime(instant, context.timeZone)}</p>
    {((context.at !== null && !selected) || context.invalidTime) && <p>The shared observing hour is invalid, expired or outside the next 24 hours. Showing the position now; return to Stargazer to choose a new hour.</p>}
    {selected && <p className="text-sm">Position at the midpoint of the selected observing hour.</p>}
    <SkyFindingDiagram position={position} />
    <p className="text-sm text-muted-foreground">Calculated position, not confirmed visibility. Clouds, light pollution, buildings and trees affect the view. Directions use true north.</p>
  </section>;
}

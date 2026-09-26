'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  const compass = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(position.azimuth / 45) % 8];
  return <section className="container-primary p-4 space-y-2">
    <h2 className="font-semibold">How to find {objectName}</h2>
    <p>{context.label || `${coordinates.lat}, ${coordinates.lon}`} · {formatObservingTime(instant, context.timeZone)}</p>
    {context.at !== null && !selected && <p>The shared observing hour has expired or is outside tonight. Showing the position now.</p>}
    <p>{position.altitude <= 0 ? 'Below the horizon at this time.' : position.altitude >= 85 ? 'Nearly overhead.'
      : `Face ${compass}; look about ${Math.round(position.altitude)}° above the horizon.`}</p>
    <p className="text-sm text-muted-foreground">Calculated position, not confirmed visibility. Clouds, light pollution, buildings and trees affect the view. Directions use true north.</p>
  </section>;
}

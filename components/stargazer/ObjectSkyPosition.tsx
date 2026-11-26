'use client';

import { useEffect, useState } from 'react';
import SkyFindingDiagram from '@/components/stargazer/SkyFindingDiagram';
import { catalogObjectAltAz } from '@/lib/stargazer/astronomy';
import { formatObservingTime } from '@/lib/stargazer/context';
import type { ReactNode } from 'react';
import type { StargazerContext, StargazerCoordinates } from '@/lib/stargazer/context';

interface ObjectSkyPositionProps {
  ra: number;
  dec: number;
  context: StargazerContext & { coordinates: StargazerCoordinates };
}

export default function ObjectSkyPosition({ ra, dec, context }: ObjectSkyPositionProps): ReactNode {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const { coordinates } = context;
  const selected = context.at !== null && context.at >= now && context.at <= now + 86400000;
  const instant = selected ? context.at! + 1800000 : now;
  const position = catalogObjectAltAz(ra, dec, coordinates.lat, coordinates.lon, new Date(instant));

  return <div className="space-y-2">
    <p>{context.label || `${coordinates.lat}, ${coordinates.lon}`} · {formatObservingTime(instant, context.timeZone)}</p>
    {((context.at !== null && !selected) || context.invalidTime) && <p>The shared observing hour is invalid, expired or outside the next 24 hours. Showing the current position. Return to Stargazer to choose a new hour.</p>}
    {selected && <p className="text-sm">Position at the midpoint of the selected observing hour.</p>}
    <SkyFindingDiagram position={position} />
    <p className="text-sm text-muted-foreground">Calculated position, not confirmed visibility. Clouds, light pollution, buildings and trees affect the view. Directions use true north.</p>
  </div>;
}

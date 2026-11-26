'use client';

import { useId, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { getStargazerHref, readStargazerContext } from '@/lib/stargazer/context';
import ObjectGuideCitySearch from './ObjectGuideCitySearch';
import type { ReactNode } from 'react';
import type { StargazerContext } from '@/lib/stargazer/context';

// Reference-only visits do not need the astronomy engine or a running clock.
const ObjectSkyPosition = dynamic(() => import('./ObjectSkyPosition'), {
  loading: () => <p>Calculating sky position…</p>,
});

interface TonightVisibilityProps { ra: number; dec: number; objectId: string; objectName: string }

export default function TonightVisibility({ ra, dec, objectId, objectName }: TonightVisibilityProps): ReactNode {
  const params = useSearchParams();
  const context = readStargazerContext(params);
  const coordinates = context.coordinates;
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);

  function selectCity(place: Pick<StargazerContext, 'coordinates' | 'label' | 'timeZone'>): void {
    const current = readStargazerContext(new URLSearchParams(window.location.search));
    const href = getStargazerHref({
      ...current,
      ...place,
      invalidCoordinates: false,
      at: null,
      invalidTime: false,
    }, { objectId });
    window.history.pushState(null, '', href + window.location.hash);
    heading.current?.focus({ preventScroll: true });
  }

  return <section aria-labelledby={headingId} className="container-primary p-4 space-y-3">
    <h2 id={headingId} ref={heading} tabIndex={-1} className="font-semibold">How to find {objectName}</h2>
    {!coordinates && <p>Choose a city to calculate where to look.</p>}
    <ObjectGuideCitySearch key={params.toString()} initialLabel={context.label} onSelect={selectCity} />
    <div aria-live="polite">
      {coordinates && <ObjectSkyPosition ra={ra} dec={dec} context={{ ...context, coordinates }} />}
    </div>
  </section>;
}

'use client';

import { Suspense } from 'react';
import StargazerContextLink from '@/components/stargazer/StargazerContextLink';
import { formatType, formatBestMonths } from '@/lib/stargazer/catalog';
import { getBeginnerTarget } from '@/lib/stargazer/beginner-targets';
import { cn } from '@/lib/utils';
import { themeTokens } from '@/lib/theme-tokens';
import type { DeepSkyObject } from '@/lib/stargazer/types';
import TonightVisibility from '@/components/stargazer/TonightVisibility';

interface ObjectDetailProps {
  object: DeepSkyObject;
}

const difficultyColors: Record<string, string> = {
  beginner: 'text-foreground',
  intermediate: 'text-foreground',
  advanced: 'text-foreground',
};

export default function ObjectDetail({ object: obj }: ObjectDetailProps) {
  const styles = themeTokens.card;
  const reviewed = getBeginnerTarget(obj.id);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 font-mono">
      {/* Header */}
      <div className={cn('container-primary p-4', styles)}>
        <Suspense fallback={<a href="/stargazer#targets">Back to Stargazer</a>}><StargazerContextLink
          className="text-xs uppercase tracking-wider text-primary hover:underline"
        >
          {'\u25C0'} Back to Stargazer
        </StargazerContextLink></Suspense>

        <h1 className="mt-3 text-xl font-bold text-primary">
          {obj.id} - {obj.name.toUpperCase()}
        </h1>
        {obj.altNames.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Also known as: {obj.altNames.join(', ')}
          </p>
        )}
      </div>

      {/* Quick Facts + Description */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className={cn('container-primary p-4 md:col-span-1', styles)}>
          <h2 className="border-b border-subtle pb-2 mb-3 text-xs uppercase tracking-wider text-muted-foreground">
            Quick Facts
          </h2>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd>{formatType(obj.type)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Constellation</dt>
              <dd>{obj.constellation}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Distance</dt>
              <dd>{obj.distance}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Magnitude</dt>
              <dd>{obj.magnitude.toFixed(1)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Size</dt>
              <dd>{obj.size}</dd>
            </div>
            {obj.discoveredBy && (
              <div>
                <dt className="text-muted-foreground">Discovered By</dt>
                <dd>{obj.discoveredBy}</dd>
              </div>
            )}
            <div className="border-t border-subtle pt-2">
              <dt className="text-muted-foreground">Viewing</dt>
              <dd className="mt-1 space-y-1">
                <p>Naked Eye: {reviewed ? (reviewed.minimumEquipment === 'eyes' ? 'Suggested' : 'Use equipment below') : obj.nakedEyeVisible === true ? 'Catalog: possible' : obj.nakedEyeVisible === false ? 'No' : 'Unknown'}</p>
                <p>Binoculars: {reviewed ? (reviewed.minimumEquipment !== 'telescope' ? 'Suggested' : 'Use a telescope') : obj.binocularTarget === true ? 'Catalog: possible' : obj.binocularTarget === false ? 'No' : 'Unknown'}</p>
                {obj.telescopeMinAperture && (
                  <p>Min Scope: {obj.telescopeMinAperture}</p>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Difficulty</dt>
              <dd className={cn('uppercase', difficultyColors[obj.difficulty])}>
                {obj.difficulty}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Best Months</dt>
              <dd>{formatBestMonths(obj.bestMonths)}</dd>
            </div>
          </dl>
        </div>

        <div className={cn('container-primary p-4 md:col-span-2', styles)}>
          <h2 className="border-b border-subtle pb-2 mb-3 text-xs uppercase tracking-wider text-muted-foreground">
            What Is It?
          </h2>
          <div className="space-y-3 text-xs leading-relaxed">
            {obj.longDescription ? (
              <p>{obj.longDescription}</p>
            ) : (
              <p>{obj.description}</p>
            )}
            {obj.physicalProperties && (
              <p className="text-muted-foreground">{obj.physicalProperties}</p>
            )}
          </div>
        </div>
      </div>

      <section className="container-primary p-4 space-y-3 text-sm">
        <h2 className="font-semibold">What to expect through your eyes</h2>
        {reviewed ? <><p>{reviewed.appearance}</p><p>{reviewed.guidance}</p><a className="text-primary underline" href={reviewed.source.url}>{reviewed.source.title}</a></>
          : <><p>This object has not been reviewed for our beginner recommendation set. Catalog equipment notes are reference information; sky darkness, aperture and experience affect what you can see.</p><p>Do not expect the color and detail of a long-exposure photograph. Check an observing guide before setting out.</p></>}
      </section>

      {/* Tonight's Visibility */}
      <Suspense fallback={<p>Loading observing location…</p>}>
        <TonightVisibility ra={obj.ra} dec={obj.dec} objectName={obj.name} />
      </Suspense>

      {/* Imaging Tips */}
      <div className={cn('container-primary p-4', styles)}>
        <h2 className="border-b border-subtle pb-2 mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Imaging Tips
        </h2>
        <p className="text-xs leading-relaxed">{obj.imagingTips}</p>
      </div>

      {/* Notable Features */}
      {obj.notableFeatures && (
        <div className={cn('container-primary p-4', styles)}>
          <h2 className="border-b border-subtle pb-2 mb-3 text-xs uppercase tracking-wider text-muted-foreground">
            Notable Features
          </h2>
          <p className="text-xs leading-relaxed">{obj.notableFeatures}</p>
        </div>
      )}

      {/* Wikipedia link */}
      {obj.wikipediaSlug && (
        <div className="text-xs">
          <a
            href={`https://en.wikipedia.org/wiki/${obj.wikipediaSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Learn more: Wikipedia {'\u2197'}
          </a>
        </div>
      )}
    </div>
  );
}

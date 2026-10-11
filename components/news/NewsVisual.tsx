'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { safeExternalUrl } from '@/lib/safe-url';
import { hazardFamily, visualTime } from '@/lib/news/visuals';
import { isVerifiedActiveWarning } from '@/lib/news/rails';
import HazardIllustration from './HazardIllustration';
import { getCategoryConfig } from './CategoryBadge';
import type { ReactElement } from 'react';
import type { RSSItem } from '@/lib/services/rss/parse-feed';

interface NewsVisualProps {
  item: RSSItem;
  variant?: 'default' | 'compact' | 'hero';
  className?: string;
}

/** All news surfaces share image meaning, attribution, sizing and error fallback. */
export default function NewsVisual({ item, variant = 'default', className }: NewsVisualProps): ReactElement {
  const [failedUrl, setFailedUrl] = useState<string>();
  const image = item.image;
  const src = image ? safeExternalUrl(image.url) : null;
  const sourceUrl = image ? safeExternalUrl(image.sourceUrl) : null;
  const showImage = Boolean(src && src !== failedUrl);
  const showProductFacts = image?.kind === 'product';
  const family = hazardFamily(item);
  const compact = variant === 'compact';
  const config = getCategoryConfig(item.category);
  const CategoryIcon = config.icon;
  const quake = item.category === 'earthquakes' && item.magnitude != null;

  return (
    <figure className={cn('m-0 min-w-0 bg-muted border-b border-border', compact && 'w-24 shrink-0 border', className)}>
      <div className={cn('flex items-center justify-center overflow-hidden',
        compact ? 'h-20' : variant === 'hero' ? 'h-64 lg:h-80' : showImage ? 'h-52 sm:h-56' : 'h-36')}
        data-testid={!showImage ? 'news-card-data-banner' : undefined}
        aria-hidden={!showImage && !family && !quake ? true : undefined}>
        {showImage && image ? (
          // Feed hosts vary. Keep direct loading; never proxy arbitrary URLs through the image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src!} alt={image.alt} className="w-full h-full object-contain"
            loading={variant === 'hero' ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedUrl(src!)} />
        ) : family ? <HazardIllustration family={family} /> : quake ? (
          <div className="text-center px-2 font-mono">
            <span className={cn('font-bold', compact ? 'text-lg' : 'text-3xl')}>M{item.magnitude!.toFixed(1)}</span>
            {!compact && item.location ? <p className="text-xs">{item.location}</p> : null}
            {!compact && item.depth != null ? <p className="text-xs">{item.depth.toFixed(1)} km depth</p> : null}
          </div>
        ) : <CategoryIcon className="h-10 w-10 text-primary" aria-hidden="true" />}
      </div>
      {(showImage || showProductFacts) && image ? (
        <figcaption className={cn('px-3 py-2 text-muted-foreground leading-relaxed break-words', compact ? 'text-[10px]' : 'text-xs')}>
          {!showImage && family ? <p className="font-mono">TYPE ILLUSTRATION</p> : null}
          <p>{!showImage ? 'Map unavailable · ' : ''}{image.caption}</p>
          {image.issuedAt ? <p>Issued <time dateTime={image.issuedAt}>{visualTime(image.issuedAt)}</time></p> : null}
          {image.validFrom && image.validUntil ? <p>Valid <time dateTime={image.validFrom}>{visualTime(image.validFrom)}</time>
            {' – '}<time dateTime={image.validUntil}>{visualTime(image.validUntil)}</time></p> : null}
          {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2"
            onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
            {showImage ? image.credit : `Product source: ${image.credit}`}
          </a> : <span>{image.credit}</span>}
        </figcaption>
      ) : family ? <figcaption className="px-2 pb-2 text-center text-[10px] font-mono text-muted-foreground">TYPE ILLUSTRATION</figcaption> : null}
    </figure>
  );
}

interface NewsHazardFactsProps {
  item: RSSItem;
}

export function NewsHazardFacts({ item }: NewsHazardFactsProps): ReactElement | null {
  const delayed = item.sourceState === 'delayed' || item.sourceState === 'unavailable';
  const label = delayed ? 'Delayed report · current status unverified'
    : item.sourceState === 'partial' ? 'Partial source coverage · current status unverified'
    : item.tropicalStatus === 'final' ? 'Final advisory · active status unverified'
    : item.tropicalStatus === 'handoff' ? 'Responsibility handoff · active status unverified'
    : isVerifiedActiveWarning(item) ? 'Verified active NWS warning'
    : item.kind === 'hazard' ? 'Hazard report · active status unverified'
    : item.kind === 'outlook' ? 'Outlook'
    : item.occurredAt ? 'Earthquake occurrence' : item.kind === 'event' ? 'Event report' : null;
  if (!item.hazard && !label) return null;
  return <div className="my-2 text-xs leading-relaxed text-muted-foreground">
    {label ? <p className="font-mono font-bold text-foreground">{label}</p> : null}
    {item.hazard ? <p className="font-mono font-bold text-foreground">{item.hazard.event}</p> : null}
    {item.location ? <p>{item.location}</p> : null}
    {item.occurredAt ? <p>Occurred <time dateTime={item.occurredAt}>{visualTime(item.occurredAt)}</time></p> : null}
    {item.updatedAt ? <p>Record updated <time dateTime={item.updatedAt}>{visualTime(item.updatedAt)}</time></p> : null}
    {item.hazard?.effective ? <p>Effective <time dateTime={item.hazard.effective}>{visualTime(item.hazard.effective)}</time></p> : null}
    {item.hazard?.expires ? <p>Expires <time dateTime={item.hazard.expires}>{visualTime(item.hazard.expires)}</time></p> : null}
    {item.sourceCheckedAt ? <p>Source checked <time dateTime={item.sourceCheckedAt}>{visualTime(item.sourceCheckedAt)}</time></p> : null}
    {item.updates && item.updates.length > 1 ? <details className="mt-2" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
      <summary className="cursor-pointer underline">Official updates ({item.updates.length})</summary>
      <ul className="mt-1 space-y-1">{item.updates.map(update => {
        const url = safeExternalUrl(update.url);
        return url ? <li key={`${update.id}:${update.issuedAt}`}><a href={url} target="_blank" rel="noopener noreferrer" className="underline">
          {update.title} · {visualTime(update.issuedAt)}
        </a></li> : null;
      })}</ul>
    </details> : null}
  </div>;
}

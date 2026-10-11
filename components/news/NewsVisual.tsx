'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { safeExternalUrl } from '@/lib/safe-url';
import { hazardFamily, visualTime } from '@/lib/news/visuals';
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
          <img src={src!} alt={image.alt} className={cn('w-full h-full', image.kind === 'product' ? 'object-contain' : 'object-cover')}
            loading={variant === 'hero' ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedUrl(src!)} />
        ) : family ? <HazardIllustration family={family} /> : quake ? (
          <div className="text-center px-2 font-mono">
            <span className={cn('font-bold', compact ? 'text-lg' : 'text-3xl')}>M{item.magnitude!.toFixed(1)}</span>
            {!compact && item.location ? <p className="text-xs">{item.location}</p> : null}
            {!compact && item.depth != null ? <p className="text-xs">{item.depth.toFixed(1)} km depth</p> : null}
          </div>
        ) : <CategoryIcon className="h-10 w-10 text-primary" aria-hidden="true" />}
      </div>
      {showImage && image ? (
        <figcaption className={cn('px-3 py-2 text-muted-foreground leading-relaxed break-words', compact ? 'text-[10px]' : 'text-xs')}>
          <p>{image.caption}</p>
          {image.issuedAt ? <p>Issued <time dateTime={image.issuedAt}>{visualTime(image.issuedAt)}</time></p> : null}
          {image.validFrom && image.validUntil ? <p>Valid <time dateTime={image.validFrom}>{visualTime(image.validFrom)}</time>
            {' – '}<time dateTime={image.validUntil}>{visualTime(image.validUntil)}</time></p> : null}
          {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2"
            onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
            {image.credit}
          </a> : <span>{image.credit}</span>}
        </figcaption>
      ) : family ? <figcaption className="px-2 pb-2 text-center text-[10px] font-mono text-muted-foreground">TYPE ILLUSTRATION</figcaption> : null}
    </figure>
  );
}

export function NewsHazardFacts({ item }: { item: RSSItem }): ReactElement | null {
  if (!item.hazard) return null;
  return <div className="my-2 text-xs leading-relaxed text-muted-foreground">
    <p className="font-mono font-bold text-foreground">{item.hazard.event}</p>
    {item.location ? <p>{item.location}</p> : null}
    {item.hazard.effective ? <p>Effective <time dateTime={item.hazard.effective}>{visualTime(item.hazard.effective)}</time></p> : null}
    {item.hazard.expires ? <p>Expires <time dateTime={item.hazard.expires}>{visualTime(item.hazard.expires)}</time></p> : null}
  </div>;
}

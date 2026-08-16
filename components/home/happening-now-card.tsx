'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getHubAlertsHref } from '@/lib/home/hub-links';

export type HappeningNowCardProps = {
  count: number | null;
  headline: string;
  severity: string | null;
  topAlertId: string | null;
  accentColor: string;
  loading?: boolean;
};

export default function HappeningNowCard({
  count,
  headline,
  severity,
  topAlertId,
  accentColor,
  loading = false,
}: HappeningNowCardProps) {
  const empty = (count ?? 0) === 0;
  const href = getHubAlertsHref(topAlertId);

  return (
    <Link
      href={href}
      data-testid="home-hub-card"
      className={cn(
        'group block rounded-md border border-border/80 bg-card/60 px-3 py-3 font-mono',
        'min-w-[16rem] sm:min-w-[20rem] flex-1',
        'transition-colors hover:border-primary/50 hover:bg-card/80 focus-visible:outline-2',
        'focus-visible:outline-primary focus-visible:outline-offset-2',
      )}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-sm border border-border/60"
          style={{ backgroundColor: empty ? '#64748b' : accentColor }}
          aria-hidden
        />
        <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
          Happening now
        </p>
      </div>
      {loading ? (
        <div className="space-y-1 animate-pulse" aria-hidden>
          <div className="h-4 w-4/5 rounded bg-muted/40" />
          <div className="h-3 w-full rounded bg-muted/30" />
        </div>
      ) : empty ? (
        <>
          <p className="text-sm font-bold leading-tight text-foreground">
            No active alerts for this pin
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Tornado, flash flood, and severe thunderstorm polygons only
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-bold leading-tight text-foreground group-hover:text-primary line-clamp-2">
            {headline}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {count} warning{count === 1 ? '' : 's'} on this pin
            {severity ? ` · ${severity}` : ''}
          </p>
        </>
      )}
    </Link>
  );
}

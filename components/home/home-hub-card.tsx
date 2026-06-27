'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { isExternalHubHref } from '@/lib/home/hub-links';

export interface HomeHubCardProps {
  title: string;
  value: string;
  detail?: string;
  href: string;
  accentColor?: string;
  loading?: boolean;
  className?: string;
}

export default function HomeHubCard({
  title,
  value,
  detail,
  href,
  accentColor = 'var(--primary)',
  loading = false,
  className,
}: HomeHubCardProps) {
  const classNames = cn(
    'group block shrink-0 rounded-md border border-border/80 bg-card/50 px-2.5 py-2 font-mono',
    'w-[9.25rem] sm:w-[10rem]',
    'transition-colors hover:border-primary/50 hover:bg-card/80 focus-visible:outline-2',
    'focus-visible:outline-primary focus-visible:outline-offset-2',
    className,
  );

  const content = (
    <>
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-sm border border-border/60"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        />
        <p className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      {loading ? (
        <div className="space-y-1 animate-pulse" aria-hidden>
          <div className="h-3 w-4/5 rounded bg-muted/40" />
          <div className="h-2.5 w-full rounded bg-muted/30" />
        </div>
      ) : (
        <>
          <p className="text-xs font-bold leading-tight text-foreground group-hover:text-primary line-clamp-2">
            {value}
          </p>
          {detail ? (
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground line-clamp-1">{detail}</p>
          ) : null}
        </>
      )}
    </>
  );

  if (isExternalHubHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="home-hub-card"
        className={classNames}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} data-testid="home-hub-card" className={classNames}>
      {content}
    </Link>
  );
}

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getStargazerHref, readStargazerContext } from '@/lib/stargazer/context';
import type { ReactNode } from 'react';

interface StargazerContextLinkProps { children: ReactNode; className?: string }

/** Small dynamic boundary so the guide's static content stays prerendered. */
export default function StargazerContextLink({ children, className }: StargazerContextLinkProps): ReactNode {
  const context = readStargazerContext(useSearchParams());
  return <Link className={className} href={getStargazerHref(context, { tab: context.from })}>{children}</Link>;
}

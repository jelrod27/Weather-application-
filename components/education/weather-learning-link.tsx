'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getWeatherReturnHref } from '@/lib/weather/journey'
import type { ComponentProps, ReactElement } from 'react'

type WeatherLearningLinkProps = ComponentProps<typeof Link>

function ContextLink({ href, ...props }: WeatherLearningLinkProps): ReactElement {
  const query = useSearchParams()
  const returnTo = getWeatherReturnHref(query?.get('returnTo') ?? null)
  if (typeof href === 'string' && returnTo?.startsWith('/read-your-sky') &&
    (href.startsWith('/education') || href.startsWith('/cloud-types') || href.startsWith('/weather-systems'))) {
    const url = new URL(href, 'https://www.16bitweather.co')
    url.searchParams.set('returnTo', returnTo)
    return <Link {...props} href={`${url.pathname}${url.search}${url.hash}`} />
  }
  return <Link {...props} href={href} />
}

/** Static links stay crawlable; only an existing local-sky return is propagated. */
export default function WeatherLearningLink(props: WeatherLearningLinkProps): ReactElement {
  return <Suspense fallback={<Link {...props} />}><ContextLink {...props} /></Suspense>
}

function SkyReturn(): ReactElement | null {
  const query = useSearchParams()
  const returnTo = getWeatherReturnHref(query?.get('returnTo') ?? null)
  return returnTo?.startsWith('/read-your-sky')
    ? <Link href={returnTo} className="inline-flex min-h-11 items-center text-sm text-primary underline mr-5">Back to Read your sky</Link> : null
}

export function SkyLearningReturn(): ReactElement {
  return <Suspense fallback={null}><SkyReturn /></Suspense>
}

import { readSkyContext } from '@/lib/sky/context'
import SkyReading from './sky-reading'
import type { Metadata } from 'next'
import type { ReactElement } from 'react'

export const metadata: Metadata = {
  title: 'Read your sky',
  description: 'Understand the estimated cloud cover near your selected place, now and over the next two hours.',
  robots: { index: false, follow: true },
}

interface SkyPageProps { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function SkyPage({ searchParams }: SkyPageProps): Promise<ReactElement> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) if (typeof value === 'string') params.set(key, value)
  const context = readSkyContext(params)
  return <SkyReading key={JSON.stringify(context)} context={context} />
}

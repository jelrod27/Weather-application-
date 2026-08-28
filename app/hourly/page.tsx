import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import HourlyClient from './hourly-client'

export const dynamic = 'force-dynamic'

export default function HourlyPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-12 h-12 animate-spin text-[var(--accent)]" />
            <span className="ml-4 text-xl text-[var(--text)]">Loading hourly forecast...</span>
          </div>
        </div>
      }
    >
      <HourlyClient />
    </Suspense>
  )
}

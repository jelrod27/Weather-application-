import type { Metadata } from 'next'
import Link from 'next/link'
import PageWrapper from '@/components/page-wrapper'
import WarningRecovery from '@/components/warnings/warning-recovery'
import WarningAreaMap from '@/components/warnings/warning-area-map'
import { WarningDetailBody } from '@/components/warnings/warning-detail-body'
import { loadCanonicalAlertBySlug } from '@/lib/bitwatch/ingest'
import { findAlertByQueryParam } from '@/lib/home/hub-links'
import { fetchActiveAlertsDetail } from '@/lib/services/nws-alerts-service'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'
import { warningIdSlug, warningReturnHref } from '@/lib/warnings/alert-links'

const BASE_URL = 'https://www.16bitweather.co'

type PageParams = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ returnTo?: string }>
}

async function loadAlert(rawId: string) {
  const decoded = (() => {
    try {
      return decodeURIComponent(rawId)
    } catch {
      return rawId
    }
  })()
  const supabase = createServiceRoleSupabaseClient()
  if (supabase) {
    const stored = await loadCanonicalAlertBySlug(supabase, decoded)
    if (stored) return stored
  }
  const alerts = await fetchActiveAlertsDetail()
  const matchedId = findAlertByQueryParam(alerts, decoded) ?? findAlertByQueryParam(alerts, warningIdSlug(decoded))
  return alerts.find((alert) => alert.id === matchedId) ?? null
}

/** areaDesc is a semicolon list of counties that can run to hundreds of characters. */
function shortenAreaDesc(areaDesc: string): string {
  const parts = areaDesc.split(/;\s*/).filter(Boolean)
  const shown = parts.slice(0, 2).join('; ')
  const rest = parts.length - 2
  const label = rest > 0 ? `${shown} +${rest} more` : shown
  return label.length > 60 ? `${label.slice(0, 57).trimEnd()}…` : label
}

/** ISO timestamp for robots unavailable_after, or undefined when NWS gave no usable expiry. */
function expiryForRobots(expires: string | undefined): string | undefined {
  if (!expires) return undefined
  const time = new Date(expires).getTime()
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = await params
  // The root layout's title template appends the brand. Expired and failed
  // loads stay noindex and point at the warning center rather than inheriting
  // the homepage canonical.
  try {
    const alert = await loadAlert(id)
    if (!alert) {
      return {
        title: 'Warning expired',
        robots: { index: false, follow: true },
        alternates: { canonical: `${BASE_URL}/warnings` },
      }
    }
    const unavailableAfter = expiryForRobots(alert.expires)
    return {
      title: `${alert.event} — ${shortenAreaDesc(alert.areaDesc)}`,
      description: alert.headline || alert.instruction || `Active ${alert.event} from the National Weather Service.`,
      alternates: { canonical: `${BASE_URL}/warnings/${encodeURIComponent(warningIdSlug(alert.id))}` },
      // Inactive pages are noindex; tell Google when this product expires.
      robots: {
        index: true,
        follow: true,
        ...(unavailableAfter ? { unavailable_after: unavailableAfter } : {}),
      },
    }
  } catch {
    return {
      title: 'Warning',
      robots: { index: false, follow: true },
      alternates: { canonical: `${BASE_URL}/warnings` },
    }
  }
}

export default async function WarningDetailPage({ params, searchParams }: PageParams) {
  const { id } = await params
  const returnTo = warningReturnHref((await searchParams)?.returnTo)
  let alert
  try {
    alert = await loadAlert(id)
  } catch (error) {
    console.error('[WarningDetailPage] Could not load warning', error)
    return <PageWrapper><WarningRecovery id={id} returnTo={returnTo} reason="unavailable" /></PageWrapper>
  }

  if (!alert) {
    return <PageWrapper><WarningRecovery id={id} returnTo={returnTo} reason="inactive" /></PageWrapper>
  }

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link href={returnTo} className="text-xs font-mono underline text-primary">
          {returnTo === '/severe' ? 'Back to severe weather' : 'Back to warning center'}
        </Link>
        <div className="rounded-lg border border-amber-500/50 bg-card/80 p-4 md:p-6">
          <WarningDetailBody alert={alert} returnTo={returnTo} />
          <div className="mt-6"><WarningAreaMap alert={alert} /></div>
        </div>
      </div>
    </PageWrapper>
  )
}

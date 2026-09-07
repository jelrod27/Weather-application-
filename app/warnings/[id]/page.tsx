import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PageWrapper from '@/components/page-wrapper'
import { WarningDetailBody } from '@/components/warnings/warning-detail-body'
import { loadCanonicalAlertBySlug } from '@/lib/bitwatch/ingest'
import { findAlertByQueryParam } from '@/lib/home/hub-links'
import { fetchActiveAlertsDetail } from '@/lib/services/nws-alerts-service'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'
import { warningIdSlug } from '@/lib/warnings/alert-links'

const BASE_URL = 'https://www.16bitweather.co'

type PageParams = {
  params: Promise<{ id: string }>
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
      // The page 404s once the alert expires; tell Google when to drop it.
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

export default async function WarningDetailPage({ params }: PageParams) {
  const { id } = await params
  let alert
  try {
    alert = await loadAlert(id)
  } catch {
    alert = null
  }

  if (!alert) {
    notFound()
  }

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link href="/warnings" className="text-xs font-mono underline text-primary">
          Back to warning center
        </Link>
        <div className="rounded-lg border border-amber-500/50 bg-card/80 p-4 md:p-6">
          <WarningDetailBody alert={alert} />
        </div>
      </div>
    </PageWrapper>
  )
}

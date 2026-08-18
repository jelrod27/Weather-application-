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

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = await params
  try {
    const alert = await loadAlert(id)
    if (!alert) {
      return {
        title: 'Warning expired | 16 Bit Weather',
        robots: { index: false, follow: true },
      }
    }
    return {
      title: `${alert.event} — ${alert.areaDesc} | 16 Bit Weather`,
      description: alert.headline || alert.instruction || `Active ${alert.event} from the National Weather Service.`,
      alternates: { canonical: `${BASE_URL}/warnings/${encodeURIComponent(warningIdSlug(alert.id))}` },
    }
  } catch {
    return { title: 'Warning | 16 Bit Weather' }
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

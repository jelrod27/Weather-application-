import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import PageWrapper from '@/components/page-wrapper'
import { verifyGuestSubscriber } from '@/lib/services/guest-alert-subscribers'
import { guestManagePath } from '@/lib/alerts/guest-tokens'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role-client'

export const metadata: Metadata = {
  title: 'Verify alert email | 16 Bit Weather',
  robots: { index: false, follow: false },
}

export default async function AlertVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const supabase = createServiceRoleSupabaseClient()

  if (!token || !supabase) {
    return (
      <PageWrapper>
        <div className="max-w-lg mx-auto px-4 py-16 font-mono text-center space-y-3">
          <h1 className="text-2xl font-bold uppercase">Verification failed</h1>
          <p className="text-sm text-muted-foreground">This link is missing or alerts are not configured.</p>
          <Link href="/alerts" className="underline text-primary text-sm">
            Back to Bitwatch
          </Link>
        </div>
      </PageWrapper>
    )
  }

  const subscriber = await verifyGuestSubscriber(supabase, token)
  if (!subscriber) {
    return (
      <PageWrapper>
        <div className="max-w-lg mx-auto px-4 py-16 font-mono text-center space-y-3">
          <h1 className="text-2xl font-bold uppercase">Link expired</h1>
          <p className="text-sm text-muted-foreground">
            Request a new confirmation from Bitwatch.
          </p>
          <Link href="/alerts" className="underline text-primary text-sm">
            Back to Bitwatch
          </Link>
        </div>
      </PageWrapper>
    )
  }

  const href = guestManagePath(subscriber.id)
  redirect(href.includes('?') ? `${href}&verified=1` : `${href}?verified=1`)
}

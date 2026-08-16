import type { Metadata } from 'next'
import { Suspense } from 'react'
import PageWrapper from '@/components/page-wrapper'
import AlertManageClient from './manage-client'

export const metadata: Metadata = {
  title: 'Manage alert pin | 16 Bit Weather',
  robots: { index: false, follow: false },
}

export default function AlertManagePage() {
  return (
    <PageWrapper>
      <div className="max-w-lg mx-auto px-4 py-12 space-y-4">
        <h1 className="text-2xl font-bold font-mono uppercase">Manage alert pin</h1>
        <Suspense fallback={<p className="font-mono text-sm text-muted-foreground">Loading…</p>}>
          <AlertManageClient />
        </Suspense>
      </div>
    </PageWrapper>
  )
}

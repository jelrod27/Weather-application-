import Link from 'next/link'
import PageWrapper from '@/components/page-wrapper'

export default function WarningNotFound() {
  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-4 font-mono text-center">
        <h1 className="text-2xl font-bold uppercase">Warning not active</h1>
        <p className="text-sm text-muted-foreground">
          This product may have expired or the National Weather Service is no longer listing it.
        </p>
        <Link href="/warnings" className="underline text-primary text-sm">
          Return to the warning center
        </Link>
      </div>
    </PageWrapper>
  )
}

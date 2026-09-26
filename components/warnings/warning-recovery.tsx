'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getOfficialWarningHref } from '@/lib/warnings/alert-links'

interface WarningRecoveryProps { id: string; returnTo: string; reason: 'unavailable' | 'inactive' }

export default function WarningRecovery({ id, returnTo, reason }: WarningRecoveryProps): React.JSX.Element {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return <div role={reason === 'unavailable' ? 'alert' : 'status'} className="max-w-3xl mx-auto p-8 space-y-4 font-mono">
    <h1 className="text-xl font-bold">{reason === 'unavailable' ? 'Warning information unavailable' : 'Warning not in the active feed'}</h1>
    <p>{reason === 'unavailable' ? 'We could not check this warning.' : 'This warning may have expired or been replaced.'} Use the official NWS alert for its current status.</p>
    <div className="flex flex-wrap gap-4 text-sm">
      <button disabled={pending} className="underline" onClick={() => startTransition(() => router.refresh())}>{pending ? 'Retrying…' : 'Retry warning'}</button>
      <a href={getOfficialWarningHref(id)} target="_blank" rel="noreferrer" className="underline">Official NWS alert</a>
      <Link href={returnTo} className="underline">Back to {returnTo === '/severe' ? 'severe weather' : 'warning center'}</Link>
    </div>
  </div>
}

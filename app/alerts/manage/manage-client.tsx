'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PushOptIn } from '@/components/alerts/push-opt-in'

export default function AlertManageClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function act(action: 'pause' | 'resume' | 'delete') {
    if (!token) return
    setBusy(true)
    try {
      const res = await fetch('/api/alerts/guest-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      })
      const data = (await res.json()) as { error?: string; status?: string }
      if (!res.ok) throw new Error(data.error ?? 'Update failed')
      setStatus(data.status ?? 'updated')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-muted-foreground">
        Missing manage token.{' '}
        <Link href="/warnings" className="underline text-primary">
          Warning center
        </Link>
      </p>
    )
  }

  return (
    <div className="space-y-4 font-mono text-sm">
      <p className="text-muted-foreground">
        Email alerts cover Tornado, Flash Flood, and Severe Thunderstorm warnings on your pin.
        Issuance only — no all-clear.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={() => void act('pause')}>
          Pause
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void act('resume')}>
          Resume
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void act('delete')}>
          Delete pin
        </Button>
      </div>
      {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      <PushOptIn guestToken={token} />
      <Link href="/warnings" className="underline text-primary text-xs">
        Back to warning center
      </Link>
    </div>
  )
}

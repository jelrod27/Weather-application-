'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export function PushOptIn({ guestToken }: { guestToken?: string }) {
  const { user } = useAuth()
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/push/vapid-public')
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as { publicKey?: string }
        if (!cancelled && data.publicKey) setPublicKey(data.publicKey)
      })
      .catch(() => {
        // push is optional
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!publicKey) return null
  if (!guestToken && !user) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 font-mono text-sm space-y-2">
        <h3 className="font-bold uppercase tracking-wider text-base">Browser alerts</h3>
        <p className="text-xs text-muted-foreground">
          Sign in or confirm an email pin first. We never ask for notification permission on page load.
        </p>
      </div>
    )
  }

  async function enable() {
    if (!publicKey) return
    setBusy(true)
    setMessage(null)
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('This browser does not support web push')
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Notification permission was not granted')
      }
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })
      const json = subscription.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          guestToken,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Could not save subscription')
      setMessage('Browser alerts enabled for this device.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not enable push')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 font-mono text-sm space-y-3">
      <h3 className="font-bold uppercase tracking-wider text-base">Browser alerts</h3>
      <p className="text-xs text-muted-foreground">
        Supplemental only. Same warning types and upgrades as email. Install to Home Screen on iOS
        to receive them. A warning ending is not an all-clear.
      </p>
      <Button type="button" size="sm" className="font-mono" disabled={busy} onClick={() => void enable()}>
        {busy ? 'Enabling…' : 'Enable browser alerts'}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  )
}

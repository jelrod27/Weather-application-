'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'

const TYPES = [
  { id: 'hail', label: 'Hail' },
  { id: 'wind', label: 'Wind' },
  { id: 'tornado', label: 'Tornado / funnel' },
  { id: 'flood', label: 'Flood' },
  { id: 'funnel', label: 'Funnel cloud' },
  { id: 'other', label: 'Other' },
] as const

interface StormReportFormProps {
  initialLat?: number | null
  initialLon?: number | null
  className?: string
}

export default function StormReportForm({
  initialLat,
  initialLon,
  className,
}: StormReportFormProps) {
  const { user } = useAuth()
  const [reportType, setReportType] = useState<(typeof TYPES)[number]['id']>('hail')
  const [description, setDescription] = useState('')
  const [latitude, setLatitude] = useState(
    initialLat != null && Number.isFinite(initialLat) ? String(initialLat) : ''
  )
  const [longitude, setLongitude] = useState(
    initialLon != null && Number.isFinite(initialLon) ? String(initialLon) : ''
  )
  const [locationName, setLocationName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  React.useEffect(() => {
    if (initialLat != null && Number.isFinite(initialLat)) setLatitude(String(initialLat))
    if (initialLon != null && Number.isFinite(initialLon)) setLongitude(String(initialLon))
  }, [initialLat, initialLon])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    try {
      const lat = parseFloat(latitude)
      const lon = parseFloat(longitude)
      const res = await fetch('/api/storm-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: reportType,
          description,
          latitude: lat,
          longitude: lon,
          location_name: locationName || undefined,
          image_url: imageUrl || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Submit failed')
      }
      toast({ title: 'Report received', description: 'Pending review before it appears on the map.' })
      setDescription('')
      setImageUrl('')
    } catch (err) {
      toast({
        title: 'Could not submit',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className={cn('rounded-lg border border-border bg-card/50 p-4 font-mono text-sm', className)}>
        <p className="text-muted-foreground mb-2">Sign in to submit a ground-truth observation.</p>
        <Button asChild size="sm" variant="secondary">
          <Link href="/auth">Log in</Link>
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn('rounded-lg border border-border bg-card/50 p-4 space-y-3 font-mono text-sm', className)}
    >
      <h3 className="font-bold uppercase tracking-wider text-base">Submit observation</h3>
      <p className="text-xs text-muted-foreground">
        Reports are moderated. No guarantees of publication. Be accurate and safe.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs uppercase text-muted-foreground">
          Type
          <select
            className="mt-1 w-full rounded border border-border bg-background px-2 py-2 text-sm"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as (typeof TYPES)[number]['id'])}
          >
            {TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs uppercase text-muted-foreground">
          Location name (optional)
          <Input className="mt-1 font-mono" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs uppercase text-muted-foreground">
          Latitude
          <Input
            className="mt-1 font-mono"
            required
            inputMode="decimal"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
          />
        </label>
        <label className="text-xs uppercase text-muted-foreground">
          Longitude
          <Input
            className="mt-1 font-mono"
            required
            inputMode="decimal"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
          />
        </label>
      </div>
      <label className="text-xs uppercase text-muted-foreground block">
        Description (10–2000 chars)
        <textarea
          className="mt-1 w-full min-h-[100px] rounded border border-border bg-background px-2 py-2 text-sm"
          required
          minLength={10}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label className="text-xs uppercase text-muted-foreground block">
        Photo URL (optional, https)
        <Input
          className="mt-1 font-mono"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
        />
      </label>
      <p className="text-[11px] text-muted-foreground">
        Optional photo of hail, flooding, or damage. Moderated before it appears on the map.
      </p>
      <Button type="submit" disabled={submitting} className="font-mono">
        {submitting ? 'Submitting…' : 'Submit for review'}
      </Button>
    </form>
  )
}

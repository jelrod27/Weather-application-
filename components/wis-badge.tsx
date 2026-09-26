'use client'

/**
 * 16-Bit Weather Platform - Weather Intensity Score Badge
 *
 * Persistent navbar badge showing real-time weather severity.
 * Polls /api/weather/wis every 5 minutes.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface WISData {
  score: number
  level: 'green' | 'yellow' | 'orange' | 'red'
  label: string
  totalAlerts: number
}

const POLL_INTERVAL = 5 * 60 * 1000 // 5 minutes

const levelColors: Record<string, string> = {
  green: 'bg-green-500/20 text-green-400 border-green-500/40',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  red: 'bg-red-500/20 text-red-400 border-red-500/40',
}

const dotColors: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
}

export default function WISBadge() {
  const [wis, setWis] = useState<WISData | null>(null)

  const fetchWIS = useCallback(async () => {
    try {
      const response = await fetch('/api/weather/wis')
      if (!response.ok) { setWis(null); return }
      const data = await response.json()
      setWis(data)
    } catch {
      setWis(null)
    }
  }, [])

  useEffect(() => {
    fetchWIS()
    const interval = setInterval(fetchWIS, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchWIS])

  if (!wis) return null

  return (
    <Link
      href="/warnings"
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-mono font-bold transition-all hover:scale-105',
        levelColors[wis.level]
      )}
      title={`US nationwide weather intensity: ${wis.label} (${wis.totalAlerts} active alerts)`}
    >
      <span className={cn(
        'w-2 h-2 rounded-full',
        dotColors[wis.level],
        wis.level === 'red' && 'animate-pulse'
      )} />
      <span>US</span>
      <span className="hidden sm:inline">{wis.label}</span>
      <span className="font-extrabold">{wis.score}</span>
    </Link>
  )
}

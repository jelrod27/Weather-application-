'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme-provider'
import { getComponentStyles, type ThemeType } from '@/lib/theme-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type AltitudeLayer = 'high' | 'mid' | 'low' | 'vertical'

interface CloudChip {
  id: string
  name: string
  layer: AltitudeLayer
  hint: string
}

const CLOUD_CHIPS: CloudChip[] = [
  { id: 'cirrus', name: 'Cirrus', layer: 'high', hint: 'Wispy ice crystals above 20,000 ft' },
  { id: 'altocumulus', name: 'Altocumulus', layer: 'mid', hint: 'Mackerel sky patches at mid levels' },
  { id: 'stratus', name: 'Stratus', layer: 'low', hint: 'Flat gray deck near the surface' },
  { id: 'cumulonimbus', name: 'Cumulonimbus', layer: 'vertical', hint: 'Storm tower through the whole troposphere' },
]

const LAYERS: { id: AltitudeLayer; label: string; range: string }[] = [
  { id: 'high', label: 'High', range: '20,000–40,000 ft' },
  { id: 'mid', label: 'Mid', range: '6,500–20,000 ft' },
  { id: 'low', label: 'Low', range: 'Surface–6,500 ft' },
  { id: 'vertical', label: 'Vertical', range: 'Full stack' },
]

export default function CloudAltitudeStack() {
  const { theme } = useTheme()
  const themeClasses = getComponentStyles((theme || 'nord') as ThemeType, 'weather')
  const [selectedCloud, setSelectedCloud] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, AltitudeLayer | null>>({})
  const [feedback, setFeedback] = useState<string | null>(null)

  const correctCount = CLOUD_CHIPS.filter((c) => assignments[c.id] === c.layer).length
  const complete = correctCount === CLOUD_CHIPS.length

  const handleLayerClick = (layer: AltitudeLayer) => {
    if (!selectedCloud) {
      setFeedback('Pick a cloud type first, then tap a layer.')
      return
    }
    const cloud = CLOUD_CHIPS.find((c) => c.id === selectedCloud)
    if (!cloud) return

    setAssignments((prev) => ({ ...prev, [selectedCloud]: layer }))
    if (cloud.layer === layer) {
      setFeedback(`${cloud.name} belongs in the ${layer} layer. Nice!`)
    } else {
      setFeedback(`Not quite — ${cloud.hint}`)
    }
    setSelectedCloud(null)
  }

  const reset = () => {
    setAssignments({})
    setSelectedCloud(null)
    setFeedback(null)
  }

  return (
    <Card className={cn('container-primary', themeClasses.background)}>
      <CardHeader>
        <CardTitle className={cn('text-xl font-mono uppercase', themeClasses.headerText)}>
          Cloud Altitude Lab
        </CardTitle>
        <p className={cn('text-sm font-mono', themeClasses.text)}>
          Select a cloud, then place it in the correct altitude layer. Sort all four to complete the lab.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {CLOUD_CHIPS.map((cloud) => {
            const assigned = assignments[cloud.id]
            const isCorrect = assigned === cloud.layer
            return (
              <button
                key={cloud.id}
                type="button"
                onClick={() => {
                  if (assigned === cloud.layer) return
                  setSelectedCloud(cloud.id)
                  setFeedback(`Place ${cloud.name}…`)
                }}
                className={cn(
                  'px-3 py-2 rounded-md text-xs font-mono font-bold border transition-colors',
                  selectedCloud === cloud.id && 'ring-2 ring-primary',
                  isCorrect
                    ? 'border-green-500/60 bg-green-500/10 text-green-400'
                    : 'border-primary/30 hover:border-primary/60',
                )}
                disabled={isCorrect}
              >
                {cloud.name}
                {isCorrect && ' ✓'}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {LAYERS.map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => handleLayerClick(layer.id)}
              className={cn(
                'p-4 rounded-lg border text-left transition-all hover:scale-[1.02]',
                'border-primary/20 hover:border-primary/50 bg-background/40',
              )}
            >
              <div className={cn('text-sm font-mono font-bold uppercase', themeClasses.accentText)}>
                {layer.label}
              </div>
              <div className={cn('text-xs font-mono mt-1', themeClasses.text)}>{layer.range}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {CLOUD_CHIPS.filter((c) => assignments[c.id] === layer.id).map((c) => (
                  <Badge key={c.id} variant="outline" className="font-mono text-[10px]">
                    {c.name}
                  </Badge>
                ))}
              </div>
            </button>
          ))}
        </div>

        {feedback && (
          <p className={cn('text-xs font-mono', complete ? themeClasses.successText : themeClasses.text)}>
            {complete ? 'All clouds classified — you are sky-ready. Explore the Cloud Atlas next.' : feedback}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <span className={cn('text-xs font-mono', themeClasses.text)}>
            Progress: {correctCount}/{CLOUD_CHIPS.length}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={reset} className="font-mono text-xs">
            Reset lab
          </Button>
          {complete && (
            <Link
              href="/cloud-types"
              className={cn('text-xs font-mono font-bold underline', themeClasses.accentText)}
            >
              Open Cloud Atlas →
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

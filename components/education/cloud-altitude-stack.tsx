'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type AltitudeLayer = 'high' | 'mid' | 'low' | 'vertical'

export interface CloudQuizQuestion {
  id: string
  name: string
  layer: AltitudeLayer
  hint: string
}

export const CLOUD_QUIZ_QUESTIONS: CloudQuizQuestion[] = [
  {
    id: 'cirrus',
    name: 'Cirrus',
    layer: 'high',
    hint: 'Thin, wispy ice-crystal clouds you see on fair-weather days.',
  },
  {
    id: 'altocumulus',
    name: 'Altocumulus',
    layer: 'mid',
    hint: 'Patchy “mackerel sky” clouds in the middle of the troposphere.',
  },
  {
    id: 'stratus',
    name: 'Stratus',
    layer: 'low',
    hint: 'A flat gray deck that often brings drizzle or overcast skies.',
  },
  {
    id: 'cumulonimbus',
    name: 'Cumulonimbus',
    layer: 'vertical',
    hint: 'The towering storm cloud that can span the entire troposphere.',
  },
]

const LAYER_OPTIONS: { id: AltitudeLayer; label: string; range: string }[] = [
  { id: 'high', label: 'High clouds', range: '20,000–40,000 ft' },
  { id: 'mid', label: 'Mid-level clouds', range: '6,500–20,000 ft' },
  { id: 'low', label: 'Low clouds', range: 'Surface–6,500 ft' },
  { id: 'vertical', label: 'Vertical development', range: 'Surface to tropopause' },
]

export function isCorrectCloudLayer(question: CloudQuizQuestion, layer: AltitudeLayer): boolean {
  return question.layer === layer
}

export default function CloudAltitudeStack() {
  const [step, setStep] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  )

  const question = CLOUD_QUIZ_QUESTIONS[step]
  const complete = step >= CLOUD_QUIZ_QUESTIONS.length

  const handleAnswer = (layer: AltitudeLayer) => {
    if (complete || !question) return

    if (isCorrectCloudLayer(question, layer)) {
      const nextCorrect = correctCount + 1
      setCorrectCount(nextCorrect)
      if (step === CLOUD_QUIZ_QUESTIONS.length - 1) {
        setFeedback({
          kind: 'success',
          message: 'Nice work — all four clouds classified correctly.',
        })
        setStep(CLOUD_QUIZ_QUESTIONS.length)
      } else {
        setStep((prev) => prev + 1)
        setFeedback(null)
      }
      return
    }

    setFeedback({
      kind: 'error',
      message: `Not quite. ${question.hint}`,
    })
  }

  const reset = () => {
    setStep(0)
    setCorrectCount(0)
    setFeedback(null)
  }

  return (
    <Card className="container-nested border border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-mono uppercase tracking-wide text-primary">
          Cloud altitude quiz
        </CardTitle>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          One question at a time — pick the altitude layer where each cloud usually lives.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {!complete && question && (
          <>
            <div className="flex items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
              <span>
                Question {step + 1} of {CLOUD_QUIZ_QUESTIONS.length}
              </span>
              <span>
                Score {correctCount}/{CLOUD_QUIZ_QUESTIONS.length}
              </span>
            </div>

            <div className="rounded-lg border border-border/60 bg-card/50 p-5">
              <p className="text-xs font-mono uppercase tracking-widest text-primary mb-2">
                Which layer?
              </p>
              <h3 className="text-2xl font-bold text-foreground">{question.name}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{question.hint}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LAYER_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant="outline"
                  onClick={() => handleAnswer(option.id)}
                  className="h-auto min-h-[4.5rem] flex flex-col items-start gap-1 px-4 py-3 text-left whitespace-normal"
                >
                  <span className="font-semibold text-foreground">{option.label}</span>
                  <span className="text-xs text-muted-foreground font-normal">{option.range}</span>
                </Button>
              ))}
            </div>
          </>
        )}

        {complete && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Quiz complete</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  You matched all four cloud types to their altitude layers. Explore the full atlas
                  for species, rare formations, and spotting tips.
                </p>
                <Link
                  href="/cloud-types"
                  className="inline-block mt-3 text-sm font-semibold text-primary hover:underline"
                >
                  Open Cloud Atlas
                </Link>
              </div>
            </div>
          </div>
        )}

        {feedback && (
          <div
            className={cn(
              'flex items-start gap-2 rounded-md px-3 py-2 text-sm leading-relaxed',
              feedback.kind === 'success'
                ? 'bg-green-500/10 text-green-700 dark:text-green-300'
                : 'bg-destructive/10 text-destructive',
            )}
            role="status"
          >
            {feedback.kind === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            {complete ? 'Try again' : 'Reset quiz'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

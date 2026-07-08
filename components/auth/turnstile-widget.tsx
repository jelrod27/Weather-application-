'use client'

import { useEffect, useRef } from 'react'

/**
 * Cloudflare Turnstile CAPTCHA widget.
 *
 * Renders nothing unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so the auth
 * forms work unchanged until CAPTCHA is enabled. When enabling, also set the
 * secret key in Supabase Dashboard -> Authentication -> Bot and Abuse
 * Protection, otherwise Supabase will not verify the tokens.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id: string) => void
    }
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export function isTurnstileEnabled(): boolean {
  return typeof TURNSTILE_SITE_KEY === 'string' && TURNSTILE_SITE_KEY.length > 0
}

interface TurnstileWidgetProps {
  /** Called with a fresh token, or null when the token expires/errors. */
  onToken: (token: string | null) => void
  /** Bump to force a re-render of the widget (tokens are single-use). */
  resetKey?: number
}

export default function TurnstileWidget({ onToken, resetKey = 0 }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!isTurnstileEnabled() || !containerRef.current) return

    let cancelled = false

    const ensureScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window.turnstile) {
          resolve()
          return
        }
        let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
        if (!script) {
          script = document.createElement('script')
          script.src = SCRIPT_SRC
          script.async = true
          document.head.appendChild(script)
        }
        script.addEventListener('load', () => resolve(), { once: true })
        script.addEventListener(
          'error',
          () => reject(new Error('Failed to load Turnstile script')),
          { once: true },
        )
      })

    ensureScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) return
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'auto',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      })
      .catch((err) => {
        console.error('[turnstile]', err)
        onTokenRef.current(null)
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [resetKey])

  if (!isTurnstileEnabled()) {
    return null
  }

  return <div ref={containerRef} className="flex justify-center" data-testid="turnstile-widget" />
}

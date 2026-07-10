'use client'

import { useEffect, useRef, useState } from 'react'

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
const SCRIPT_LOAD_TIMEOUT_MS = 10_000

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

function ensureScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile requires a browser environment'))
  }
  if (window.turnstile) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      fn()
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      document.head.appendChild(script)
    }

    const onLoad = () => settle(() => resolve())
    const onError = () =>
      settle(() => {
        script?.remove()
        reject(new Error('Failed to load Turnstile script'))
      })

    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })

    const timeoutId = window.setTimeout(() => {
      settle(() => {
        script?.remove()
        reject(new Error('Timed out loading Turnstile script'))
      })
    }, SCRIPT_LOAD_TIMEOUT_MS)

    // Script may already be loaded (or failed) before listeners attached.
    if (window.turnstile) {
      settle(() => resolve())
    }
  })
}

export default function TurnstileWidget({ onToken, resetKey = 0 }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!isTurnstileEnabled() || !containerRef.current) return

    let cancelled = false
    setLoadError(null)

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
        if (!cancelled) {
          setLoadError(
            'Security check failed to load. Disable ad blockers for this site, or refresh and try again.',
          )
        }
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

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="flex justify-center" data-testid="turnstile-widget" />
      {loadError && (
        <p className="text-center text-xs font-mono text-red-500" data-testid="turnstile-load-error" role="alert">
          {loadError}
        </p>
      )}
    </div>
  )
}

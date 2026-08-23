'use client'

import { useState } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function TestSentryPage() {
  const [message, setMessage] = useState('')

  const throwClientError = () => {
    setMessage('Throwing client error...')
    throw new Error('Test Client Error from Browser - This should appear in Sentry!')
  }

  const throwServerError = async () => {
    setMessage('Throwing server error...')
    const response = await fetch('/api/test-sentry-error')
    const data = await response.json()
    setMessage(data.message || 'Server error thrown')
  }

  const captureManualError = () => {
    setMessage('Capturing manual error...')
    Sentry.captureException(new Error('Manual Test Error - Captured via Sentry.captureException()'))
    setMessage('Manual error captured! Check Sentry dashboard.')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Sentry Error Testing</h1>
        <p className="mb-6 text-gray-300">
          Use these buttons to test if errors are being captured by Sentry.
        </p>

        <div className="space-y-4">
          <button
            onClick={throwClientError}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
          >
            Throw Client Error (Browser)
          </button>

          <button
            onClick={throwServerError}
            className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-semibold"
          >
            Throw Server Error (API Route)
          </button>

          <button
            onClick={captureManualError}
            className="w-full px-4 py-3 bg-terminal-accent-info hover:bg-terminal-accent-info/80 rounded-lg font-semibold"
          >
            Capture Manual Error
          </button>
        </div>

        {message && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-sm">{message}</p>
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h2 className="font-semibold mb-2">Instructions:</h2>
          <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
            <li>Click one of the error buttons above</li>
            <li>Check your browser console for &quot;Sentry event captured&quot; logs</li>
            <li>Go to your Sentry dashboard: https://justin-elrod.sentry.io/</li>
            <li>Navigate to Issues to see captured errors</li>
            <li>Errors should appear within 1-2 minutes</li>
          </ol>
        </div>
      </div>
    </div>
  )
}


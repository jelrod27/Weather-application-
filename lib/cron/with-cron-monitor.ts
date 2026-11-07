import { captureCheckIn } from '@sentry/nextjs'

/**
 * Call only after cron authentication. HTTP failure responses must reflect job
 * failures, including partial processing/delivery failures that did not throw.
 */
export async function withCronMonitor<T extends { ok: boolean }>(
  monitorSlug: 'severe-alerts' | 'bitwatch-ingest',
  run: () => Promise<T>,
): Promise<T> {
  let checkInId: string | undefined
  try {
    // Await also isolates a rejected result if an instrumentation adapter is async.
    checkInId = await captureCheckIn({ monitorSlug, status: 'in_progress' }, {
      schedule: { type: 'crontab', value: '* * * * *' },
      timezone: 'UTC',
      checkinMargin: 1,
      // Routes have a 55-second platform limit; timeouts must become failures.
      maxRuntime: 1,
    })
  } catch {
    // Observability must never prevent a weather alert from being processed.
  }

  let status: 'ok' | 'error' = 'error'
  const started = Date.now()
  try {
    const response = await run()
    if (response.ok) status = 'ok'
    return response
  } finally {
    try {
      await captureCheckIn({
        monitorSlug,
        ...(checkInId ? { checkInId } : {}),
        status,
        duration: (Date.now() - started) / 1000,
      })
    } catch {
      // Preserve the job's response or original exception when Sentry fails.
    }
  }
}

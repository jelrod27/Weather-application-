/**
 * @jest-environment node
 *
 * runHubRequest is the per-card request runner for the home hub. Every hub
 * card runs its fetch through it so that no rejection, abort or network
 * failure alike, can escape into the hook's `void` call and surface as an
 * unhandled rejection. Sentry 16BIT-WEATHER-WEB-B and 16BIT-WEATHER-WEB-8.
 */

import { runHubRequest } from '@/lib/home/hub-request'

function abortError(): Error {
  const error = new Error('signal is aborted without reason')
  error.name = 'AbortError'
  return error
}

describe('runHubRequest', () => {
  it('resolves quietly and touches no state when the request is aborted', async () => {
    const controller = new AbortController()
    const onFailure = jest.fn()
    const onSettled = jest.fn()

    const run = runHubRequest({
      signal: controller.signal,
      task: () =>
        new Promise<void>((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(abortError()))
        }),
      onFailure,
      onSettled,
    })
    controller.abort()

    await expect(run).resolves.toBeUndefined()
    expect(onFailure).not.toHaveBeenCalled()
    expect(onSettled).not.toHaveBeenCalled()
  })

  it('records the failure and settles when the request fails at the network level', async () => {
    const onFailure = jest.fn()
    const onSettled = jest.fn()

    const run = runHubRequest({
      signal: new AbortController().signal,
      task: () => Promise.reject(new TypeError('Failed to fetch')),
      onFailure,
      onSettled,
    })

    await expect(run).resolves.toBeUndefined()
    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onSettled).toHaveBeenCalledTimes(1)
  })

  it('settles without recording a failure when the request succeeds', async () => {
    const onFailure = jest.fn()
    const onSettled = jest.fn()

    await runHubRequest({
      signal: new AbortController().signal,
      task: () => Promise.resolve(),
      onFailure,
      onSettled,
    })

    expect(onFailure).not.toHaveBeenCalled()
    expect(onSettled).toHaveBeenCalledTimes(1)
  })
})

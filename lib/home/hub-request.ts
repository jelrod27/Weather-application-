import { isAbortError } from '@/lib/abort-error';

export interface HubRequestOptions {
  signal?: AbortSignal;
  /** The fetch and state update for one hub card. May throw. */
  task: () => Promise<void>;
  /** Put the card into its fallback state. Not called for aborts. */
  onFailure: () => void;
  /** Clear the card's loading state. Not called once the signal is aborted. */
  onSettled: () => void;
}

/**
 * Run one hub card request so that nothing it throws escapes the caller.
 *
 * The hub fans out several fetches under one `void` call. Any rejection that
 * reaches `Promise.all` there becomes an unhandled rejection, and a fetch that
 * rejects before its handler runs leaves the card's loading flag set.
 * Aborts (navigation away) are silent; everything else lands in the
 * fallback state and clears loading.
 */
export async function runHubRequest({
  signal,
  task,
  onFailure,
  onSettled,
}: HubRequestOptions): Promise<void> {
  try {
    await task();
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) return;
    onFailure();
  } finally {
    if (!signal?.aborted) onSettled();
  }
}

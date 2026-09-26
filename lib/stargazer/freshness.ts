interface StargazerFreshness {
  stale: boolean;
  source: 'provider' | 'page';
  time: number | null;
}

/** Thirty minutes is a product refresh policy, not a claim about model issuance. */
export function getStargazerFreshness(
  retrievedAt: string | null | undefined, receivedAt: number | null, now: number,
): StargazerFreshness {
  const provider = Date.parse(retrievedAt ?? '');
  const knownProvider = Number.isFinite(provider) && provider <= now;
  const time = knownProvider ? provider : receivedAt;
  const validReceipt = receivedAt != null && Number.isFinite(receivedAt) && receivedAt <= now;
  return { time, source: knownProvider ? 'provider' : 'page',
    stale: !Number.isFinite(now) || !validReceipt || time == null || !Number.isFinite(time) || now - time > 30 * 60000 || now - receivedAt! > 30 * 60000 };
}

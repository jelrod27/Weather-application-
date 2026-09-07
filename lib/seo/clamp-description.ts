/** Google truncates descriptions around this width on desktop results. */
export const MAX_DESCRIPTION_LENGTH = 158

/**
 * Cut a description to fit a search snippet without ending mid-word.
 *
 * Prefers the last sentence boundary that keeps at least 60% of the budget,
 * then the last word boundary, and strips a dangling punctuation mark.
 */
export function clampDescription(text: string, max = MAX_DESCRIPTION_LENGTH): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean

  const head = clean.slice(0, max + 1)
  const sentenceEnd = Math.max(
    head.lastIndexOf('. '),
    head.lastIndexOf('! '),
    head.lastIndexOf('? '),
  )
  if (sentenceEnd >= Math.floor(max * 0.6)) {
    return head.slice(0, sentenceEnd + 1)
  }

  const wordEnd = head.lastIndexOf(' ')
  const cut = head.slice(0, wordEnd > 0 ? wordEnd : max)
  return cut.replace(/[\s,;:\-–—(]+$/, '')
}

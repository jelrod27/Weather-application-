/** Keep edition dates identical in server HTML and every reader's browser. */
export function formatBlogDate(date: string, month: 'long' | 'short'): string {
  return new Date(date)
    .toLocaleDateString('en-US', {
      month,
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase()
}

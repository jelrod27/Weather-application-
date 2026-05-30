/**
 * News feed health-check (PRD §14 manual gate for the news-overhaul work).
 *
 * Imports the live FEED_SOURCES list, fetches every ENABLED feed with the same
 * User-Agent the aggregator uses, follows redirects, and prints `status id url`.
 * Exits non-zero if any enabled feed returns a non-2xx status so it can gate a
 * commit. NOT wired into CI (external network); run manually:
 *
 *   npx tsx scripts/check-news-feeds.ts
 */

import { FEED_SOURCES } from '../lib/services/rss/feedSources'

const USER_AGENT = '16-Bit Weather RSS Aggregator/1.0'
const TIMEOUT_MS = 15000

interface Result {
  id: string
  url: string
  status: number
  ok: boolean
  note: string
}

async function checkFeed(id: string, url: string): Promise<Result> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    })
    const body = await res.text()
    const looksXml = /<rss|<feed|<\?xml/i.test(body.slice(0, 500))
    return {
      id,
      url,
      status: res.status,
      ok: res.ok && looksXml,
      note: res.ok && !looksXml ? 'WARNING: 2xx but body is not XML' : '',
    }
  } catch (err) {
    return {
      id,
      url,
      status: 0,
      ok: false,
      note: err instanceof Error ? err.message : String(err),
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function main() {
  const enabled = FEED_SOURCES.filter((f) => f.enabled)
  console.log(`Checking ${enabled.length} enabled feed(s)...\n`)

  const results = await Promise.all(enabled.map((f) => checkFeed(f.id, f.url)))

  let failures = 0
  for (const r of results) {
    const flag = r.ok ? '✅' : '❌'
    if (!r.ok) failures++
    console.log(`${flag} ${String(r.status).padEnd(4)} ${r.id.padEnd(22)} ${r.url}`)
    if (r.note) console.log(`      ${r.note}`)
  }

  console.log(`\n${results.length - failures}/${results.length} feeds healthy.`)
  if (failures > 0) {
    console.error(`\n${failures} feed(s) failed the health check.`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Health check crashed:', err)
  process.exit(1)
})

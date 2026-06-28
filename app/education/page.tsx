import { getAllPosts } from '@/lib/blog'
import EducationHubClient from '@/components/education/education-hub-client'
import { getShareableGuideEntries } from '@/lib/education/entries'
import { decodeHtmlEntities } from '@/lib/services/rss/html-utils'

function formatPostDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function EducationPage() {
  const latestPosts = getAllPosts()
    .slice(0, 3)
    .map((post) => ({
      slug: post.slug,
      title: decodeHtmlEntities(post.title),
      summary: decodeHtmlEntities(post.summary),
      displayDate: formatPostDate(post.date),
      href: `/blog/${encodeURIComponent(post.slug)}`,
    }))

  return <EducationHubClient latestPosts={latestPosts} shareableGuides={getShareableGuideEntries()} />
}

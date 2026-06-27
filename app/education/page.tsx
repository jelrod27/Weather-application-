import { getAllPosts } from '@/lib/blog'
import EducationHubClient from '@/components/education/education-hub-client'

export default function EducationPage() {
  const latestPosts = getAllPosts()
    .slice(0, 3)
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      date: post.date,
      href: `/blog/${post.slug}`,
    }))

  return <EducationHubClient latestPosts={latestPosts} />
}

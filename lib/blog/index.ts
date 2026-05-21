import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

import { BLOG_CATEGORIES, getPostCategoryIds, type BlogCategory } from './categories'

// Re-export the category layer so server code can import everything from
// `@/lib/blog`. Client components should import from `@/lib/blog/categories`
// directly to avoid pulling this fs-backed module into the browser bundle.
export { BLOG_CATEGORIES, getPostCategoryIds } from './categories'
export type { BlogCategory, BlogCategoryId } from './categories'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

export type NewsletterCadence = 'wednesday_topic' | 'sunday_rearview'

export interface KeyTerm {
  term: string
  definition: string
  href?: string
}

export interface BlogPost {
  slug: string
  title: string
  date: string
  author: string
  summary: string
  tags: string[]
  heroImage: string
  readTime: number
  content: string
  // Newsletter metadata. All optional — older posts predate these fields.
  // See planning/prds/PRD-newsletter-redesign.md §4.1 for semantics.
  cadence?: NewsletterCadence
  topic_slug?: string
  topic_title?: string
  theme?: string
  opener_hash?: string
  key_phrases?: string[]
  similarity_max?: number
  similarity_judge?: string
  model_used?: string
  images_used?: string[]
  spotlight_active?: string | null
  generation_retries?: number
  word_count?: number
  closer_used?: string
  keyTerms?: KeyTerm[]
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
  
  const posts = files.map(filename => {
    const filePath = path.join(BLOG_DIR, filename)
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const { data, content } = matter(fileContents)
    
    // gray-matter (js-yaml) auto-coerces YAML timestamp scalars to Date
    // objects. Next's metadata serializer renders that as "[object Object]"
    // for `article:published_time`, which X's card validator rejects —
    // breaking the share preview image. Force a string here.
    const rawDate = data.date;
    const dateString =
      rawDate instanceof Date
        ? rawDate.toISOString()
        : typeof rawDate === 'string' && rawDate
          ? rawDate
          : new Date().toISOString();

    return {
      slug: data.slug || filename.replace(/\.mdx?$/, ''),
      title: data.title || 'Untitled',
      date: dateString,
      author: data.author || '16bitbot',
      summary: data.summary || '',
      tags: data.tags || [],
      heroImage: data.heroImage || '',
      readTime: data.readTime || Math.ceil(content.split(/\s+/).length / 200),
      content,
      cadence: data.cadence,
      topic_slug: data.topic_slug,
      topic_title: data.topic_title,
      theme: data.theme,
      opener_hash: data.opener_hash,
      key_phrases: data.key_phrases,
      similarity_max: data.similarity_max,
      similarity_judge: data.similarity_judge,
      model_used: data.model_used,
      images_used: data.images_used,
      spotlight_active: data.spotlight_active,
      generation_retries: data.generation_retries,
      word_count: data.word_count,
      closer_used: data.closer_used,
      keyTerms: Array.isArray(data.keyTerms) ? data.keyTerms : undefined,
    } as BlogPost
  })
  
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): BlogPost | null {
  const posts = getAllPosts()
  return posts.find(p => p.slug === slug) || null
}

export function getAllTags(): string[] {
  const posts = getAllPosts()
  const tagSet = new Set<string>()
  posts.forEach(p => p.tags.forEach(t => tagSet.add(t)))
  return Array.from(tagSet).sort()
}

/** Categories that have at least one published post, in canonical order. */
export function getCategoriesInUse(): BlogCategory[] {
  const used = new Set(getAllPosts().flatMap(p => getPostCategoryIds(p.tags)))
  return BLOG_CATEGORIES.filter(c => used.has(c.id))
}

function getPostsByTag(tag: string): BlogPost[] {
  return getAllPosts().filter(p => p.tags.some(t => t.toLowerCase() === tag.toLowerCase()))
}

export function getRelatedPosts(currentSlug: string, limit = 3): BlogPost[] {
  const current = getPostBySlug(currentSlug)
  if (!current) return []
  
  const others = getAllPosts().filter(p => p.slug !== currentSlug)
  
  // Score by shared tags
  const scored = others.map(post => ({
    post,
    score: post.tags.filter(t => current.tags.some(ct => ct.toLowerCase() === t.toLowerCase())).length,
  }))
  
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(s => s.post)
}

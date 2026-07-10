import { redirect } from 'next/navigation'
import { validateRedirectPath } from '@/lib/utils/redirect-validation'

/**
 * Legacy route — auth is unified at /auth. Kept as a redirect so old links,
 * bookmarks, and ?next= params keep working.
 */

interface SignupPageProps {
  searchParams?: Promise<{ next?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = searchParams ? await searchParams : {}
  const query = new URLSearchParams()
  query.set('mode', 'signup')

  if (typeof params.next === 'string' && params.next.length > 0) {
    query.set('next', validateRedirectPath(params.next))
  }

  redirect(`/auth?${query.toString()}`)
}

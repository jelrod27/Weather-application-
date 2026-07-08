import { redirect } from 'next/navigation'
import { validateRedirectPath } from '@/lib/utils/redirect-validation'

/**
 * Legacy route — auth is unified at /auth. Kept as a redirect so old links,
 * bookmarks, and ?next=/error= params keep working.
 */

interface LoginPageProps {
  searchParams?: Promise<{ error?: string; next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {}
  const query = new URLSearchParams()

  if (typeof params.error === 'string' && params.error.length > 0) {
    query.set('error', params.error)
  }
  if (typeof params.next === 'string' && params.next.length > 0) {
    query.set('next', validateRedirectPath(params.next))
  }

  const queryString = query.toString()
  redirect(queryString ? `/auth?${queryString}` : '/auth')
}

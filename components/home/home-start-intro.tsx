import type { ReactElement, ReactNode } from 'react'

interface HomeStartIntroProps {
  id: string
  children: ReactNode
}

export function HomeStartIntro({ id, children }: HomeStartIntroProps): ReactElement {
  return (
    <section aria-labelledby={id} className="mx-auto mb-6 max-w-2xl rounded-lg border border-border bg-card p-5 text-center shadow-lg sm:p-8">
      <h2 id={id} className="text-2xl font-bold text-primary sm:text-3xl">Get started</h2>
      <p className="mt-2 text-foreground">See the weather where you are, or search for a city to explore its forecast.</p>
      {children}
    </section>
  )
}

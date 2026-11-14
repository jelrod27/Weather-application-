import PageWrapper from '@/components/page-wrapper'
import WinterSeoContent from '@/components/winter/winter-seo-content'
import WinterWorkspace from '@/components/winter/winter-workspace'
import type { ReactElement } from 'react'

export default function WinterPage(): ReactElement {
  return <PageWrapper>
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-7">
      <header className="space-y-3 max-w-3xl">
        <p className="text-xs font-mono font-bold text-primary tracking-widest uppercase">// Winter forecast terminal</p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-mono uppercase">Winter Weather</h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">Snow and ice probabilities, regional winter impacts, and your official local forecast. Explore the next three days across the contiguous United States with National Weather Service and Weather Prediction Center guidance.</p>
        <a href="#winter-local-heading" className="inline-block py-2 text-sm font-semibold text-primary underline underline-offset-4">Find your local winter forecast ↓</a>
      </header>
      <WinterWorkspace />
    </div>
    <WinterSeoContent />
  </PageWrapper>
}

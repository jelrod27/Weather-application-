/** Legacy /learn/glossary route — 301 redirects to /education/glossary; no duplicate SEO metadata. */
export default function LearnGlossaryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

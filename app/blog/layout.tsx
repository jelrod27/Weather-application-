/**
 * No `metadata` export here on purpose: `app/blog/page.tsx` and
 * `app/blog/[slug]/page.tsx` both set their own title, description and
 * `alternates`, and a page's metadata replaces the layout's wholesale — so a
 * copy at this level only ever drifted out of step with the pages below it.
 */
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

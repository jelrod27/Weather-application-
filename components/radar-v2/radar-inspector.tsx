'use client'

interface RadarInspectorProps {
  title: string
  body: string
  link?: string | null
  onClose: () => void
}

export function RadarInspector({ title, body, link, onClose }: RadarInspectorProps): React.JSX.Element {
  return (
    <div className="pointer-events-auto relative mx-3 mb-2 max-h-[40dvh] max-w-md overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev)] p-4 text-[var(--text)] shadow-2xl sm:ml-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-1 min-h-11 rounded-md px-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label="Close details"
      >
        Close
      </button>
      <h3 className="pr-16 text-sm font-semibold">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-muted)]">{body}</p>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          View on weather.gov
        </a>
      ) : null}
    </div>
  )
}

'use client'

interface RadarInspectorProps {
  title: string
  body: string
  link?: string | null
  onClose: () => void
}

export function RadarInspector({ title, body, link, onClose }: RadarInspectorProps) {
  return (
    <div className="pointer-events-auto absolute bottom-28 left-3 right-3 z-[2500] mx-auto max-w-md rounded-xl border border-white/10 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-md sm:left-4 sm:right-auto">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-2 text-sm text-zinc-400 hover:text-white"
        aria-label="Close details"
      >
        Close
      </button>
      <h3 className="pr-12 text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{body}</p>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex text-sm font-semibold text-cyan-300 hover:underline"
        >
          View on weather.gov
        </a>
      ) : null}
    </div>
  )
}

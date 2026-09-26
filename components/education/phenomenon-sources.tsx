import type { GuideSource } from '@/lib/education/content'

interface PhenomenonSourcesProps {
  sources: GuideSource[]
}

/** Shared by the interactive atlas and the shareable detail pages. */
export default function PhenomenonSources({ sources }: PhenomenonSourcesProps): React.JSX.Element {
  return (
    <div className="mt-4 text-xs font-mono">
      <p className="font-bold uppercase mb-2">Sources</p>
      <ul className="space-y-2">
        {sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-weather-primary underline underline-offset-2"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

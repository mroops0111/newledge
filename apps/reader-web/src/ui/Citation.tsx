import type { SourceLink } from '../proposal.js'

/**
 * The sources a node traces to, numbered against the card's own list.
 * Provenance is what makes a claim checkable rather than merely stated,
 * so it rides beside the text instead of collecting at the top of the card.
 */
export function Cites({ cites }: { cites: readonly SourceLink[] }): React.JSX.Element | null {
  if (cites.length === 0)
    return null
  return (
    <span className="ml-1.5 inline-flex gap-1 align-super">
      {cites.map(source => (
        <a
          key={source.id}
          href={source.url}
          target="_blank"
          rel="noreferrer"
          title={source.title}
          className="font-ui text-[0.625rem] tabular-nums text-ink-subtle transition-colors hover:text-concept"
        >
          {source.index}
        </a>
      ))}
    </span>
  )
}

/**
 * The pages a reading came from, listed the way a paper lists its references.
 * A filled row reads as a control rather than a citation,
 * so the number carries the structure and the title stays a plain link.
 */
export function References({ sources }: { sources: readonly SourceLink[] }): React.JSX.Element {
  return (
    <ol className="mt-4 space-y-1.5">
      {sources.map(source => (
        <li key={source.id} className="flex gap-3 font-ui text-xs leading-relaxed">
          <span className="w-4 shrink-0 text-right tabular-nums text-ink-subtle">{source.index}</span>
          {source.url === undefined
            ? <span className="text-ink-muted">{source.title}</span>
            : (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
                >
                  {source.title}
                </a>
              )}
        </li>
      ))}
    </ol>
  )
}

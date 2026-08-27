import type { GraphNode } from '../lib/graph.js'
import type { Cited, Inside } from '../lib/inside.js'
import { GroupLabel } from './Surface.js'

/**
 * What one node holds, read beside the canvas rather than on it.
 *
 * One panel for both canvases.
 * A reader picking a node on either one asks the same question of it,
 * so they are owed the same answer, laid out the same way.
 * Two panels drifted into each showing what the other did not,
 * which made which canvas a reader happened to be on decide what they learned.
 */
export function NodePanel({ node, held }: { node: GraphNode, held: Inside }): React.JSX.Element {
  return (
    <div className="w-96 overflow-y-auto px-6 py-7">
      <p className="font-ui text-title font-semibold text-ink">{node.name}</p>
      {node.description !== undefined && (
        <p className="mt-2 font-reading text-prose-sm text-ink-muted">
          {node.description}
        </p>
      )}

      {held.relations.length > 0 && (
        <section className="mt-7">
          <GroupLabel>Relations</GroupLabel>
          <ul className="mt-3 space-y-2">
            {held.relations.map(said => (
              <li key={said.phrase} className="font-ui text-prose-sm leading-snug text-ink">
                <span className="text-ink-subtle">{`${said.phrase} `}</span>
                {said.names.join(', ')}
              </li>
            ))}
          </ul>
        </section>
      )}

      {held.claims.length > 0 && (
        <section className="mt-7">
          <GroupLabel>Claims</GroupLabel>
          <ul className="mt-3 space-y-3">
            {held.claims.map(claim => (
              <li key={claim.id} className="border-l-2 border-claim pl-3">
                <p className="font-reading text-prose-sm text-ink">{claim.name}</p>
                {argued('Disputed by', held.disputes.get(claim.id), 'text-contradicts')}
                {argued('Backed by', held.agrees.get(claim.id), 'text-supports')}
              </li>
            ))}
          </ul>
        </section>
      )}

      {held.sources.length > 0 && (
        <section className="mt-7">
          <GroupLabel>Sources</GroupLabel>
          <ul className="mt-3 space-y-2">
            {held.sources.map(source => (
              <li key={source.id}>{came(source)}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/**
 * One source, opened where the graph knows where it points.
 * A source that only has a name is still worth naming,
 * since it says what a claim rests on even where it cannot be followed.
 */
function came(source: Cited): React.JSX.Element {
  const words = 'font-ui text-prose-sm leading-snug'
  return source.url === undefined
    ? <span className={`${words} text-ink-muted`}>{source.name}</span>
    : (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className={`${words} text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink`}
        >
          {source.name}
        </a>
      )
}

/** Who argues with one claim, and which way round the argument runs. */
function argued(
  label: string,
  others: readonly GraphNode[] | undefined,
  tone: string,
): React.JSX.Element | false {
  return others !== undefined && others.length > 0 && (
    <ul className="mt-1.5 space-y-1">
      {others.map(other => (
        <li key={other.id} className={`font-ui text-label leading-snug ${tone}`}>
          {`${label}: ${other.name}`}
        </li>
      ))}
    </ul>
  )
}

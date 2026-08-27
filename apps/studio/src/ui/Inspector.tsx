import type { GraphNode } from '../lib/graph.js'
import { sourcesOf } from '../lib/graph.js'
import { hostOf } from '../lib/naming.js'
import { GroupLabel } from './Surface.js'

/**
 * What one node holds, shown beside the board rather than on it.
 * A card carries only enough to be recognised,
 * so the claims made about it are read here, clear of the canvas.
 */
export function Inspector({ node, claims }: {
  node: GraphNode
  claims: readonly GraphNode[]
}): React.JSX.Element {
  const sources = sourcesOf(node)

  return (
    <div className="w-80 px-5 py-6">
      <h2 className="font-ui text-sm font-semibold text-ink">{node.name}</h2>
      {node.description !== undefined && (
        <p className="mt-2 font-reading text-prose-sm text-ink-muted">{node.description}</p>
      )}

      {claims.length > 0 && (
        <section className="mt-6">
          <GroupLabel>Claims</GroupLabel>
          <ul className="mt-2 space-y-2.5">
            {claims.map(claim => (
              <li key={claim.id} className="border-l-2 border-l-claim pl-3 font-reading text-prose-sm text-ink">
                {claim.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sources.length > 0 && (
        <section className="mt-6">
          <GroupLabel>Sources</GroupLabel>
          <ul className="mt-2 space-y-1">
            {sources.map(url => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-ui text-xs text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
                >
                  {hostOf(url)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

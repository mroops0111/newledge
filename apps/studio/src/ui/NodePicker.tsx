import { useState } from 'react'
import type { GraphNode } from '../lib/graph.js'
import { GroupLabel } from './Surface.js'

/**
 * What a reader has not put on this board yet.
 * A board holds a chosen subset, so nothing arrives on it by itself,
 * and choosing is the act that makes the arrangement mean anything.
 */
export function NodePicker({ available, onAdd }: {
  available: readonly GraphNode[]
  onAdd: (nodeId: string) => void
}): React.JSX.Element {
  const [term, setTerm] = useState('')
  const needle = term.trim().toLowerCase()
  const matching = needle === ''
    ? available
    : available.filter(node => node.name.toLowerCase().includes(needle))

  return (
    <div className="w-72 px-5 py-6">
      <GroupLabel>Not on this board</GroupLabel>
      <input
        value={term}
        onChange={event => setTerm(event.target.value)}
        placeholder="Search"
        aria-label="Search what is not on this board"
        className="mt-3 w-full rounded-control border border-line bg-surface px-3 py-1.5 font-ui text-xs text-ink outline-none focus:border-line-strong"
      />

      {matching.length === 0
        ? <p className="mt-4 font-ui text-xs text-ink-subtle">Everything here is on the board.</p>
        : (
            <ul className="mt-3 space-y-1">
              {matching.map(node => (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => onAdd(node.id)}
                    className="w-full truncate rounded-control px-2 py-1.5 text-left font-ui text-xs text-ink-muted transition-colors hover:bg-raised hover:text-ink"
                  >
                    {node.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import type { Board } from '@newledge/board'
import type { GraphNode } from '../lib/graph.js'
import type { Offer } from '../lib/unplaced.js'
import { placeable, unplaced } from '../lib/unplaced.js'

/**
 * What a card being dragged carries, which is only which node it is.
 * Where it lands is decided by where the reader let go,
 * so nothing about a placement travels with it.
 */
export const DRAGGED_NODE = 'application/x-newledge-node'

/**
 * What a reader may still put on this board, and the drag that puts it there.
 *
 * The panel it replaced listed every unplaced node flat,
 * and could not be dragged from,
 * so a reader could say a node should be on the board but never where.
 * Both are why this narrows first, and why every row is a drag handle.
 */
export function CardPicker({ nodes, board }: {
  nodes: readonly GraphNode[]
  board: Board
}): React.JSX.Element {
  const [like, setLike] = useState('')
  const [kind, setKind] = useState<string | undefined>(undefined)

  const kinds = useMemo(() => placeable(nodes), [nodes])
  const offers = useMemo(
    () => unplaced(nodes, board, { like, ...(kind === undefined ? {} : { kind }) }),
    [nodes, board, like, kind],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-4 py-3">
        <p className="font-ui text-label uppercase tracking-wide text-ink-subtle">Put on this board</p>
        <input
          value={like}
          onChange={event => setLike(event.target.value)}
          placeholder="Find a term"
          aria-label="Find a term"
          className="mt-2 w-full rounded-control border border-line bg-canvas px-2 py-1 font-ui text-prose-sm text-ink outline-none focus:border-line-strong"
        />
        {/* One kind is not a choice, it is what the graph happens to hold. */}
        {kinds.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {[undefined, ...kinds].map(one => (
              <button
                key={one ?? 'all'}
                type="button"
                onClick={() => setKind(one)}
                aria-pressed={kind === one}
                className={`rounded-full border px-2 py-0.5 font-ui text-label transition-colors ${kind === one
                  ? 'border-ink bg-ink text-canvas'
                  : 'border-line-strong text-ink-muted hover:bg-raised'}`}
              >
                {one ?? 'Everything'}
              </button>
            ))}
          </div>
        )}
      </div>

      {offers.length === 0
        ? (
            <p className="px-4 py-3 font-reading text-prose-sm text-ink-subtle">
              {like === '' ? 'This board holds everything there is to place.' : 'Nothing by that name.'}
            </p>
          )
        : (
            <ul className="min-h-0 flex-1 overflow-y-auto py-2">
              {offers.map(offer => <Draggable key={offer.id} offer={offer} showKind={kinds.length > 1} />)}
            </ul>
          )}
    </div>
  )
}

/**
 * One node, picked up rather than pressed.
 *
 * It is a list item rather than a button, because pressing it does nothing.
 * Adding without placing is what made the panel before this one unsatisfying,
 * so the only thing to do with one of these is carry it somewhere.
 */
function Draggable({ offer, showKind }: { offer: Offer, showKind: boolean }): React.JSX.Element {
  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAGGED_NODE, offer.id)
        event.dataTransfer.effectAllowed = 'copy'
      }}
      className="cursor-grab px-4 py-1.5 font-ui text-prose-sm text-ink-muted transition-colors hover:bg-raised hover:text-ink active:cursor-grabbing"
    >
      {offer.name}
      {showKind && <span className="ml-2 font-ui text-label text-ink-subtle">{offer.kind}</span>}
    </li>
  )
}

import { useMemo, useState } from 'react'
import type { Board } from '@newledge/board'
import type { GraphNode } from '../lib/graph.js'
import type { Offer } from '../lib/unplaced.js'
import { placeable, unplaced } from '../lib/unplaced.js'
import { GroupLabel } from './Surface.js'
import { GLYPHS } from './Toolkit.js'

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
 *
 * It is the width the node panel is, because they take the same place,
 * and a slot that changes width as a reader works,
 * moves the canvas out from under what they were looking at.
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
    <div className="flex h-full w-96 flex-col">
      <div className="border-b border-line px-6 pb-4 pt-7">
        <GroupLabel>Put on this board</GroupLabel>
        {/*
          What to do with a row, said once rather than guessed at.
          A list of names beside a canvas reads as a list of names,
          and nothing about one says it is meant to be carried.
        */}
        <p className="mt-1 font-reading text-prose-sm text-ink-subtle">
          Drag one onto the board. It lands where you let go.
        </p>
        <input
          value={like}
          onChange={event => setLike(event.target.value)}
          placeholder="Find a term"
          aria-label="Find a term"
          className="mt-3 w-full rounded-control border border-line bg-canvas px-2.5 py-1.5 font-ui text-prose-sm text-ink outline-none placeholder:text-ink-subtle focus:border-line-strong"
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
            <p className="px-6 py-5 font-reading text-prose-sm text-ink-subtle">
              {like === ''
                ? 'This board already holds everything there is to place.'
                : 'Nothing by that name.'}
            </p>
          )
        : (
            <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-6 py-4">
              {offers.map(offer => <Draggable key={offer.id} offer={offer} showKind={kinds.length > 1} />)}
            </ul>
          )}
    </div>
  )
}

/**
 * One node, picked up rather than pressed.
 *
 * Drawn as the card it is about to become rather than as a line of a list,
 * because what a reader is doing is moving a card onto a board,
 * and a row that looks like text reads as something to click.
 * Pressing one does nothing, which is why it carries a grip and not a border,
 * that a button would have.
 */
function Draggable({ offer, showKind }: { offer: Offer, showKind: boolean }): React.JSX.Element {
  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAGGED_NODE, offer.id)
        event.dataTransfer.effectAllowed = 'copy'
      }}
      className="flex cursor-grab items-start gap-2 rounded-card border border-line bg-surface px-2.5 py-2 transition-colors hover:border-line-strong hover:bg-raised active:cursor-grabbing"
    >
      <span className="mt-px shrink-0 text-ink-subtle">{GLYPHS.grip}</span>
      <span className="min-w-0 font-ui text-prose-sm leading-snug text-ink">
        {offer.name}
        {showKind && <span className="ml-1.5 font-ui text-label text-ink-subtle">{offer.kind}</span>}
      </span>
    </li>
  )
}

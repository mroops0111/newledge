import { useMemo, useState } from 'react'
import type { Board } from '@newledge/board'
import type { GraphNode } from '../lib/graph.js'
import type { Offer } from '../lib/unplaced.js'
import { byKind, placeable, unplaced } from '../lib/unplaced.js'
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
 * Both are why this gathers and searches, and why every row is a drag handle.
 *
 * Two ways of narrowing, not three.
 * A kind names the group its offers sit under, so a control for kinds as well,
 * would be a third thing on a panel doing the work of the heading above it.
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

  const kinds = useMemo(() => placeable(nodes), [nodes])
  const gathered = useMemo(
    () => byKind(unplaced(nodes, board, { like }), kinds),
    [nodes, board, kinds, like],
  )
  // While a reader is searching, a kind with no match is noise,
  // and the one line saying nothing matched covers all of them at once.
  const shown = like === '' ? gathered : gathered.filter(group => group.offers.length > 0)
  const empty = shown.every(group => group.offers.length === 0)

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
      </div>

      {empty && like !== ''
        ? <p className="px-6 py-5 font-reading text-prose-sm text-ink-subtle">Nothing by that name.</p>
        : (
            <div className="min-h-0 flex-1 overflow-y-auto py-4">
              {shown.map(group => (
                <section key={group.kind} className="mb-4 last:mb-0">
                  {/* A kind names its group rather than trailing every name in it. */}
                  <div className="px-6 pb-1"><GroupLabel>{group.kind}</GroupLabel></div>
                  {group.offers.length === 0
                    ? (
                        <p className="px-6 font-reading text-prose-sm text-ink-subtle">
                          Every one of these is already on the board.
                        </p>
                      )
                    : (
                        <ul>
                          {group.offers.map(offer => <Draggable key={offer.id} offer={offer} />)}
                        </ul>
                      )}
                </section>
              ))}
            </div>
          )}
    </div>
  )
}

/**
 * One node, picked up rather than pressed.
 *
 * A row rather than a box. Seven boxes down a panel is a wall,
 * and what a reader is reading here is a list,
 * so it is drawn as one and the grip is what says it can be carried.
 *
 * A title runs to two lines and then stops,
 * because a source names itself at length,
 * and rows of three heights each are harder to run an eye down,
 * than rows a reader has to open one of to read the whole of.
 */
function Draggable({ offer }: { offer: Offer }): React.JSX.Element {
  return (
    <li
      draggable
      title={offer.name}
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAGGED_NODE, offer.id)
        event.dataTransfer.effectAllowed = 'copy'
      }}
      className="group flex cursor-grab items-center gap-2 px-6 py-1.5 transition-colors hover:bg-raised active:cursor-grabbing"
    >
      {/*
        Visible before a reader hovers,
        since nothing else on the row says it can be carried onto the board.
      */}
      <span className="shrink-0 text-ink-subtle transition-colors group-hover:text-ink-muted">
        {GLYPHS.grip}
      </span>
      {/*
        The names are what this panel is,
        so they are set in the ink the node panel sets its own content in.
        Everything else here is a label about them and recedes,
        which is the whole of the hierarchy.
      */}
      <span className="line-clamp-2 min-w-0 font-ui text-prose-sm leading-snug text-ink">
        {offer.name}
      </span>
    </li>
  )
}

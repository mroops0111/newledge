import type { Board } from '@newledge/board'
import type { Placement } from '@newledge/board-layout'
import { useEffect, useState } from 'react'
import { firstArrangement } from '../lib/arrange.js'
import type { GraphEdge, GraphNode } from '../lib/graph.js'

/**
 * A board of only what a reader is focused on, arranged for reading alone.
 *
 * Focusing used to take everything else off the canvas,
 * and leave what was left where it sat,
 * so a reader was handed their own board with holes in it,
 * a card at one edge and the thing it is about at the other.
 * That is not a reading of anything,
 * which is why focusing read as a control that did nothing worth pressing.
 *
 * It is never kept.
 * Focusing is a way of looking rather than an edit,
 * so this lives as long as the reader is looking through it,
 * and the board they arranged by hand is untouched underneath.
 * That is also why nothing is dragged while it is on.
 * A card moved here would be moved in a board nobody asked to change.
 */
export function useFocusedLayout({ board, graph, near, focused, placement, onFail }: {
  board: Board | undefined
  graph: { nodes: readonly GraphNode[], edges: readonly GraphEdge[] }
  /** What the picked card is related to, which is what focusing keeps. */
  near: ReadonlySet<string>
  focused: boolean
  placement: Placement
  onFail: (why: string) => void
}): Board | undefined {
  const [arranged, setArranged] = useState<Board | undefined>(undefined)

  useEffect(() => {
    if (!focused || board === undefined) {
      setArranged(undefined)
      return
    }
    // A reader can leave focus while this is being worked out,
    // and an arrangement arriving after they have,
    // is one for a board they are no longer looking at.
    let wanted = true
    const held = new Set(board.cards.map(card => card.nodeId))
    void firstArrangement(graph, placement, node => near.has(node.id) && held.has(node.id))
      .then((again) => {
        if (wanted)
          setArranged({ ...board, ...again.board })
      })
      .catch((cause: unknown) => onFail(cause instanceof Error ? cause.message : String(cause)))
    return () => { wanted = false }
  }, [focused, board, graph, near, placement, onFail])

  // Held back until it is the board asked for,
  // since the one from the last focus is a reading of a card nobody picked.
  return focused ? arranged : undefined
}

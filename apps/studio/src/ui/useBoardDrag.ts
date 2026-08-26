import type { Board } from '@newledge/board'
import type { Box, Extent } from '@newledge/board-layout'
import type { Node, NodeChange } from '@xyflow/react'
import type { RefObject } from 'react'
import { useCallback, useRef, useState } from 'react'
import type { Guide } from '../lib/aligning.js'
import { TOLERANCE } from '../lib/aligning.js'
import type { SectionDrag } from '../lib/dragging.js'
import { landing, standingOn } from '../lib/dragging.js'

const NOTHING: readonly Guide[] = []

export interface BoardDrag {
  readonly guides: readonly Guide[]
  readonly onNodeDragStart: (event: unknown, node: Node) => void
  readonly onNodesChange: (changes: NodeChange[]) => void
  readonly onNodeDragStop: () => void
}

/**
 * Moving things about the board, and the lines saying what they line up with.
 *
 * The canvas works a position out from the pointer,
 * and applies it through the change it emits,
 * so correcting a drag anywhere else is overwritten in the same frame.
 * That is why the snapping and what a section carries with it both happen here,
 * on the way through, rather than in what the board hands over.
 */
export function useBoardDrag({ boxes, drawn, latestBoard, zoom, applyChanges, persist }: {
  boxes: ReadonlyMap<string, Box>
  drawn: readonly Node[]
  latestBoard: RefObject<Board | undefined>
  zoom: RefObject<number>
  applyChanges: (changes: NodeChange[]) => void
  persist: (board: Board) => void
}): BoardDrag {
  const [guides, setGuides] = useState<readonly Guide[]>(NOTHING)
  const sectionDrag = useRef<SectionDrag | undefined>(undefined)

  const onNodeDragStart = useCallback((_event: unknown, node: Node) => {
    const section = latestBoard.current?.sections.find(one => one.id === node.id)
    sectionDrag.current = section === undefined
      ? undefined
      : {
          id: node.id,
          at: node.position,
          held: standingOn({ ...section, ...node.position }, boxes),
        }
  }, [boxes, latestBoard])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const board = latestBoard.current
    const sections = (board?.sections ?? []).map(section => ({
      id: section.id,
      x: section.x,
      y: section.y,
      width: section.width,
      height: section.height,
    }))
    const carried: NodeChange[] = []
    let lines: readonly Guide[] = NOTHING

    const settled = changes.map((change) => {
      if (change.type !== 'position' || change.position === undefined || change.dragging !== true)
        return change
      const extent = extentOf(change.id, boxes, board)
      if (extent === undefined)
        return change

      const drag = sectionDrag.current
      const lands = landing(
        { id: change.id, at: change.position, extent },
        boxes,
        sections,
        drag,
        TOLERANCE / zoom.current,
      )
      lines = lands.guides
      // The shift a section carries is measured from where the last frame left,
      // so where it landed becomes what the next frame measures against.
      if (drag !== undefined && drag.id === change.id)
        sectionDrag.current = { ...drag, at: lands.at }
      for (const along of lands.carried)
        carried.push({ id: along.id, type: 'position', position: along.at, dragging: true })
      return { ...change, position: lands.at }
    })

    setGuides(lines)
    applyChanges([...settled, ...carried])
  }, [applyChanges, boxes, latestBoard, zoom])

  const onNodeDragStop = useCallback(() => {
    sectionDrag.current = undefined
    setGuides(NOTHING)
    const current = latestBoard.current
    if (current === undefined)
      return
    const at = new Map(drawn.map(node => [node.id, node.position]))
    persist({
      ...current,
      cards: current.cards.map(card => ({ ...card, ...(at.get(card.nodeId) ?? { x: card.x, y: card.y }) })),
      sections: current.sections.map(section =>
        ({ ...section, ...(at.get(section.id) ?? { x: section.x, y: section.y }) })),
    })
  }, [drawn, persist, latestBoard])

  return { guides, onNodeDragStart, onNodesChange, onNodeDragStop }
}

/**
 * How big the thing being dragged is, whether it is a card or a section.
 * A card's size is taken from what the board already measured,
 * rather than from the node the drag hands over, which does not carry one.
 */
function extentOf(
  id: string,
  boxes: ReadonlyMap<string, Extent>,
  board: Board | undefined,
): Extent | undefined {
  const section = board?.sections.find(one => one.id === id)
  return section === undefined
    ? boxes.get(id)
    : { width: section.width, height: section.height }
}

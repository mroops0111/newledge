import type { Board } from '@newledge/board'
import { useReactFlow } from '@xyflow/react'
import type { DragEvent, ReactNode } from 'react'
import { useCallback } from 'react'
import { CARD_WIDTH } from '../lib/boardStyle.js'
import { withCard } from '../lib/boards.js'
import { DRAGGED_NODE } from './CardPicker.js'

/**
 * Where a node let go of over the canvas lands.
 *
 * The canvas is panned and zoomed, so where a reader let go on their screen,
 * and where that is on the board, are different numbers,
 * and only the flow knows one from the other.
 * That is why this stands inside the provider rather than around it.
 *
 * Which section it lands in is not decided here and never was.
 * Membership is where a card sits, so letting go inside a section's bounds,
 * files it there with nothing else to do.
 */
export function CardDrop({ board, persist, className, children }: {
  board: Board | undefined
  persist: (board: Board) => void
  className?: string
  children: ReactNode
}): React.JSX.Element {
  const flow = useReactFlow()

  const over = useCallback((event: DragEvent) => {
    // Without this the browser refuses the drop and nothing ever arrives.
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const dropped = useCallback((event: DragEvent) => {
    event.preventDefault()
    const nodeId = event.dataTransfer.getData(DRAGGED_NODE)
    if (nodeId === '' || board === undefined)
      return

    const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
    // A card is wide and a pointer is a point,
    // so it is hung under the pointer rather than started at it,
    // which is where a reader was looking while they carried it.
    persist(withCard(board, nodeId, { x: at.x - CARD_WIDTH / 2, y: at.y }))
  }, [board, flow, persist])

  return (
    <div className={className} onDragOver={over} onDrop={dropped}>
      {children}
    </div>
  )
}

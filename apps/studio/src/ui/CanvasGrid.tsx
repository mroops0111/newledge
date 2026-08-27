import { Background, useStore } from '@xyflow/react'
import { gridAt } from '../lib/grid.js'

/**
 * The paper both canvases are drawn on.
 *
 * It says the surface goes on past what is drawn on it and can be moved,
 * which is otherwise only found out by trying,
 * and it gives a reader dragging an empty stretch something to move against.
 *
 * On a board it is doing a second job.
 * Every card lands on this spacing, or on a multiple of it,
 * so the dots are also what a card can be lined up against.
 */
export function CanvasGrid(): React.JSX.Element {
  const { spacing, dot } = gridAt(useStore(state => state.transform[2]))

  return <Background color="var(--line-strong)" gap={spacing} size={dot} />
}

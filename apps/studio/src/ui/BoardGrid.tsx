import { Background, useStore } from '@xyflow/react'
import { GRID, GRID_DOT, gridStrength } from '../lib/grid.js'

/**
 * The grid the board lands on, drawn only while it is a grid.
 *
 * A board is arranged by a reader and every card lands on this spacing,
 * so drawing it shows what a card can be lined up against.
 * Crowded past reading it stops showing that and starts hiding the paper,
 * so it is drawn at the strength the spacing has earned.
 */
export function BoardGrid(): React.JSX.Element | null {
  const strength = gridStrength(useStore(state => state.transform[2]))
  if (strength === 0)
    return null

  return (
    <Background
      color="var(--line-strong)"
      gap={GRID}
      size={GRID_DOT}
      style={{ opacity: strength }}
    />
  )
}

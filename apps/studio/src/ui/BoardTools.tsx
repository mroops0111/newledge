import { useReactFlow } from '@xyflow/react'
import { useCallback, useEffect, useRef } from 'react'
import type { Box } from '../lib/path.js'
import { GLYPHS, Toolkit } from './Toolkit.js'

const PADDING = 0.08
const NEAREST = 1
const STEP = 250

export interface BoardToolsProps {
  /** Everything on the board, which is what a fit has to take in. */
  readonly extent: readonly Box[]
  /**
   * Whether the browser has laid the cards out yet.
   * A board has its sections sized before a single card has been measured, so
   * asking the extent alone would fit to the sections and stop there.
   */
  readonly laidOut: boolean
  readonly onAddSection: () => void
  readonly onFocus: () => void
  readonly focused: boolean
  readonly canFocus: boolean
}

/**
 * The instruments a reader works a board with.
 * Fitting is worked out from where things are rather than from what the canvas
 * has managed to measure, so it takes the whole board in whether or not every
 * card has been laid out by the browser yet.
 */
export function BoardTools({ extent, laidOut, onAddSection, onFocus, focused, canFocus }: BoardToolsProps): React.JSX.Element {
  const flow = useReactFlow()
  const fitted = useRef(false)

  const fit = useCallback((duration: number) => {
    const bounds = enclosing(extent)
    if (bounds !== undefined)
      flow.fitBounds(bounds, { padding: PADDING, duration })
  }, [flow, extent])

  // The first fit waits for the browser to have laid the cards out, since
  // fitting before that takes in only the sections. It happens once, so a
  // reader who has moved on is not yanked back.
  useEffect(() => {
    if (fitted.current || !laidOut)
      return
    fitted.current = true
    fit(0)
  }, [laidOut, fit])

  return (
    <Toolkit
      groups={[
        [
          { id: 'fit', label: 'Fit the board', icon: GLYPHS.fit, onUse: () => fit(STEP) },
          { id: 'in', label: 'Zoom in', icon: GLYPHS.zoomIn, onUse: () => void flow.zoomIn({ duration: STEP }) },
          { id: 'out', label: 'Zoom out', icon: GLYPHS.zoomOut, onUse: () => void flow.zoomOut({ duration: STEP }) },
        ],
        [
          { id: 'section', label: 'Add a section', icon: GLYPHS.section, onUse: onAddSection },
        ],
        [
          {
            id: 'focus',
            label: focused ? 'Show the rest of the board' : 'Focus on what is selected',
            icon: GLYPHS.focus,
            onUse: onFocus,
            disabled: !canFocus,
            active: focused,
          },
        ],
      ]}
    />
  )
}

function enclosing(boxes: readonly Box[]): Box | undefined {
  if (boxes.length === 0)
    return undefined
  const left = Math.min(...boxes.map(box => box.x))
  const top = Math.min(...boxes.map(box => box.y))
  return {
    x: left,
    y: top,
    width: Math.max(NEAREST, Math.max(...boxes.map(box => box.x + box.width)) - left),
    height: Math.max(NEAREST, Math.max(...boxes.map(box => box.y + box.height)) - top),
  }
}

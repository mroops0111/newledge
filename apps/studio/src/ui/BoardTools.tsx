import { getViewportForBounds, useReactFlow, useStore } from '@xyflow/react'
import { useCallback, useEffect, useRef } from 'react'
import type { Box } from '@newledge/board-layout'
import { GLYPHS, Toolkit } from './Toolkit.js'

const PADDING = '8%'
const NEAREST = 1
const STEP = 250

export interface BoardToolsProps {
  /** Everything on the board, which is what a fit has to take in. */
  readonly extent: readonly Box[]
  /**
   * Whether the browser has laid the cards out yet.
   * A board has its sections sized before a single card has been measured,
   * so asking the extent alone would fit to the sections and stop there.
   */
  readonly laidOut: boolean
  readonly onAddSection: () => void
  /** Open or close what a reader drags nodes onto the board from. */
  readonly onPutting: () => void
  readonly putting: boolean
  /** Throw the reader's arrangement away and lay the board out again. */
  readonly onRearrange: () => void
  /**
   * Kept in step with how far the board is zoomed.
   * Snapping is judged in screen pixels,
   * and only something inside the canvas can say what a screen pixel is worth.
   */
  readonly zoom: { current: number }
}

/**
 * The instruments a reader works a board with.
 *
 * What a board is looked at through, what goes on it, and laying it out again.
 * What is done to one card is offered on that card,
 * since a rail is where a reader reaches before they have picked anything,
 * and an act on a card is a question they have not asked yet.
 * Fitting is worked out from where things are,
 * rather than from what the canvas has managed to measure,
 * so it takes the whole board in whether or not every card is drawn yet.
 */
export function BoardTools({ extent, laidOut, onAddSection, onPutting, putting, onRearrange, zoom }: BoardToolsProps): React.JSX.Element {
  const flow = useReactFlow()
  const fitted = useRef(false)
  const rail = useRef<HTMLDivElement>(null)
  const canvas = useStore(state => ({
    width: state.width,
    height: state.height,
    minZoom: state.minZoom,
    maxZoom: state.maxZoom,
  }), (one, other) => one.width === other.width
    && one.height === other.height
    && one.minZoom === other.minZoom
    && one.maxZoom === other.maxZoom)
  zoom.current = flow.getZoom()

  // Fitted by hand rather than by fitBounds,
  // which takes one padding for all four sides.
  // The rail stands over the left of the canvas,
  // so a board fitted evenly puts its leftmost cards underneath it.
  const fit = useCallback((duration: number) => {
    const bounds = enclosing(extent)
    if (bounds === undefined || canvas.width === 0)
      return
    flow.setViewport(
      getViewportForBounds(bounds, canvas.width, canvas.height, canvas.minZoom, canvas.maxZoom, {
        x: PADDING,
        y: PADDING,
        left: `${behind(rail.current)}px`,
      }),
      { duration },
    )
  }, [flow, extent, canvas])

  // The first fit waits for the browser to have laid the cards out,
  // since fitting before that takes in only the sections. It happens once,
  // so a reader who has moved on is not yanked back.
  useEffect(() => {
    if (fitted.current || !laidOut)
      return
    fitted.current = true
    fit(0)
  }, [laidOut, fit])

  return (
    <Toolkit
      ref={rail}
      groups={[
        [
          { id: 'fit', label: 'Fit the board', icon: GLYPHS.fit, onUse: () => fit(STEP) },
          { id: 'in', label: 'Zoom in', icon: GLYPHS.zoomIn, onUse: () => void flow.zoomIn({ duration: STEP }) },
          { id: 'out', label: 'Zoom out', icon: GLYPHS.zoomOut, onUse: () => void flow.zoomOut({ duration: STEP }) },
        ],
        // What goes on the board.
        [
          {
            id: 'put',
            label: putting ? 'Done putting things on' : 'Put something on this board',
            icon: GLYPHS.put,
            onUse: onPutting,
            active: putting,
          },
          { id: 'section', label: 'Add a section', icon: GLYPHS.section, onUse: onAddSection },
        ],
        // Alone, because it is the one that throws a reader's work away.
        [
          {
            id: 'rearrange',
            label: 'Lay the board out again, losing how you have arranged it',
            icon: GLYPHS.rearrange,
            onUse: onRearrange,
          },
        ],
      ]}
    />
  )
}

/**
 * How much of the canvas the rail covers, plus as much again to sit clear of.
 * The rail stands off the edge by the same inset it keeps from the board,
 * so it is read off the rail rather than named twice.
 */
function behind(rail: HTMLElement | null): number {
  return rail === null ? 0 : rail.offsetLeft * 2 + rail.offsetWidth
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

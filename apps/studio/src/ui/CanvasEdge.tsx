import type { EdgeProps } from '@xyflow/react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useStore } from '@xyflow/react'
import type { Point } from '@newledge/board-layout'
import { growthAt } from '../lib/boardStyle.js'
import type { Facing } from '../lib/path.js'
import { curvePath, orthogonalPath } from '../lib/path.js'
import { heldAt } from './boardEdges.js'

export interface CanvasEdgeData {
  /** Where the router said this line bends, when a router has been asked. */
  readonly points?: readonly Point[]
  readonly curved: boolean
  /** Which way the line runs as it leaves each card, once they are known. */
  readonly leaves?: Facing
  readonly arrives?: Facing
  [key: string]: unknown
}

/**
 * A line on either canvas, drawn along the route it was given.
 *
 * A router that knows where the cards are can get a line around them,
 * which the two ends alone never could,
 * so its answer is used when there is one,
 * and a plain curve is drawn when there is not.
 * A survey is laid out afresh whenever it changes and has no arrangement
 * worth routing around, so it is always the second case,
 * which is the same drawing rather than a second one.
 *
 * The weight is read here rather than handed down from the page,
 * so a reader turning the wheel redraws the lines and nothing else.
 */
export function CanvasEdge(props: EdgeProps): React.JSX.Element {
  const data = props.data as CanvasEdgeData | undefined
  const [path, labelX, labelY] = pathFor(props, data)
  const growth = growthAt(useStore(state => state.transform[2]))

  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        style={heldAt(props.style, growth)}
        {...(props.markerStart === undefined ? {} : { markerStart: props.markerStart })}
        {...(props.markerEnd === undefined ? {} : { markerEnd: props.markerEnd })}
      />
      {props.label !== undefined && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute whitespace-nowrap rounded-full border border-line bg-surface px-2 py-0.5 font-ui text-label font-semibold text-ink shadow-card"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {props.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

function pathFor(props: EdgeProps, data: CanvasEdgeData | undefined): [string, number, number] {
  const points = data?.points
  if (points !== undefined && points.length > 1) {
    // More than two points means something worked a way round what is between,
    // and bowing straight from end to end instead would run through it,
    // which leaves the line hidden under a card.
    if (points.length > 2) {
      const middle = points[Math.floor(points.length / 2)]!
      return [orthogonalPath(points), middle.x, middle.y]
    }
    const [first, last] = [points[0]!, points[points.length - 1]!]
    return data?.curved === true
      ? [curvePath(first, last, data.leaves, data.arrives), (first.x + last.x) / 2, (first.y + last.y) / 2]
      : [orthogonalPath(points), (first.x + last.x) / 2, (first.y + last.y) / 2]
  }
  const ends = {
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  }
  const [path, labelX, labelY] = getBezierPath(ends)
  return [path, labelX, labelY]
}

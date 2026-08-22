import type { EdgeProps } from '@xyflow/react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import type { Facing, Point } from '../lib/path.js'
import { curvePath, orthogonalPath } from '../lib/path.js'

export interface RoutedEdgeData {
  /** Where the router said this line bends, when a router has been asked. */
  readonly points?: readonly Point[]
  readonly curved: boolean
  /** Which way the line runs as it leaves each card, when the cards are known. */
  readonly leaves?: Facing
  readonly arrives?: Facing
  [key: string]: unknown
}

/**
 * A line drawn along the route it was given.
 * A router that knows where the cards are can get a line around them, which
 * the two ends alone never could, so its answer is used when there is one and
 * a plain curve is drawn when there is not.
 */
export function RoutedEdge(props: EdgeProps): React.JSX.Element {
  const data = props.data as RoutedEdgeData | undefined
  const [path, labelX, labelY] = pathFor(props, data)

  return (
    <>
      <BaseEdge id={props.id} path={path} style={props.style} markerEnd={props.markerEnd} />
      {props.label !== undefined && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute whitespace-nowrap rounded-full border border-line bg-surface px-2 py-0.5 font-ui text-[0.6875rem] font-semibold text-ink shadow-card"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {props.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

function pathFor(props: EdgeProps, data: RoutedEdgeData | undefined): [string, number, number] {
  const points = data?.points
  if (points !== undefined && points.length > 1) {
    // More than two points means something worked out a way round the cards in
    // between, and bowing straight from one end to the other instead would run
    // through them and leave the line hidden under one.
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

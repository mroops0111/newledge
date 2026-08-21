import type { EdgeProps } from '@xyflow/react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath } from '@xyflow/react'
import type { Point } from '../lib/path.js'
import { orthogonalPath } from '../lib/path.js'

export interface RoutedEdgeData {
  /** Where the router said this line bends, when a router has been asked. */
  readonly points?: readonly Point[]
  readonly curved: boolean
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
            className="pointer-events-none absolute rounded bg-canvas px-1 font-ui text-[0.625rem] text-ink-subtle"
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
    const middle = points[Math.floor(points.length / 2)]!
    return [orthogonalPath(points), middle.x, middle.y]
  }
  const ends = {
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  }
  const [path, labelX, labelY] = data?.curved === false
    ? getSmoothStepPath(ends)
    : getBezierPath(ends)
  return [path, labelX, labelY]
}

import type { EdgeProps } from '@xyflow/react'
import { BaseEdge, getBezierPath, useStore } from '@xyflow/react'
import { growthAt } from '../lib/boardStyle.js'
import { heldAt } from './boardEdges.js'

/**
 * A line on the survey, held against the canvas the way a board holds its own.
 *
 * A curve rather than a routed run,
 * since a survey is laid out afresh whenever it changes,
 * and has no arrangement worth routing around,
 * and a curve carries a fan out of one card better than right angles do.
 *
 * The weight is read here rather than handed down from the page,
 * so a reader turning the wheel redraws the lines and nothing else.
 */
export function SurveyEdge(props: EdgeProps): React.JSX.Element {
  const growth = growthAt(useStore(state => state.transform[2]))
  const [path] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  })

  return (
    <BaseEdge
      id={props.id}
      path={path}
      style={heldAt(props.style, growth)}
      {...(props.markerStart === undefined ? {} : { markerStart: props.markerStart })}
      {...(props.markerEnd === undefined ? {} : { markerEnd: props.markerEnd })}
    />
  )
}

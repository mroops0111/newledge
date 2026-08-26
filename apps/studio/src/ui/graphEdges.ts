import type { Edge } from '@xyflow/react'
import type { Attention } from '../lib/attention.js'
import { DIMMED, emphasisOf } from '../lib/attention.js'
import type { EdgeStyle } from '../lib/boardStyle.js'
import { edgeStyle, TONE_COLOURS } from '../lib/boardStyle.js'
import type { GraphEdge, GraphNode } from '../lib/graph.js'
import { ranked } from '../lib/layout.js'
import { markerId } from './BoardMarkers.js'

/**
 * How thick a line is drawn on the survey.
 * Thinner than the weight a board draws,
 * because a board holds a dozen lines between cards twice this wide,
 * and a survey holds every line there is between cards half the size.
 * The weight that reads as structure on one reads as a thicket on the other.
 */
const SURVEY_STROKE = 1.25

/**
 * Which end of a line carries its mark.
 *
 * A class diagram stands the diamond against the whole,
 * and the hollow triangle against the general,
 * so a reader who has read one already knows which way to read these.
 * Which end a line is drawn from is the layout's business and moves with it,
 * so the mark is placed by the root the relation declares,
 * rather than by the end it happens to be drawn from.
 *
 * A relation with no root points at what it reaches,
 * so its arrow stays at the end it arrives by.
 */
function marks(
  style: EdgeStyle,
  edge: GraphEdge,
  above: string,
): { markerStart?: string, markerEnd?: string } {
  const mark = markerId(style.marker, style.tone)
  if (mark === undefined)
    return {}
  const root = style.rootAt === 'from'
    ? edge.fromNodeId
    : style.rootAt === 'to' ? edge.toNodeId : undefined
  return root === above ? { markerStart: mark } : { markerEnd: mark }
}

/**
 * The relations as the survey canvas is given them.
 *
 * A relation carries its own dash, weight, and end from what kind it is,
 * out of the same table the board reads, so containment, dependency,
 * and argument are told apart by the line rather than by a word beside it.
 * A survey that labelled every line spent more canvas on words than on graph,
 * and the words all had to be read before any of them meant anything.
 *
 * A line is drawn the way the layout ranked it,
 * from the end standing above to the end below,
 * so a topic is never drawn hanging off what is filed under it.
 *
 * The verb is written only on the lines a reader has actually asked about,
 * which is the ones touching what they picked,
 * so it arrives when it answers something, not in case it does.
 */
export function graphEdges(
  edges: readonly GraphEdge[],
  nodes: readonly GraphNode[],
  nearby: ReadonlySet<string>,
  attention: Attention,
): Edge[] {
  const kind = new Map(nodes.map(node => [node.id, node.type]))
  const typeOf = (nodeId: string): string | undefined => kind.get(nodeId)

  return edges.flatMap((edge) => {
    const emphasis = emphasisOf(edge.id, nearby, attention)
    if (emphasis === 'gone')
      return []
    const [above, below] = ranked(edge, typeOf)
    const style = edgeStyle(edge.type)
    const paint = TONE_COLOURS[style.tone]
    const asked = nearby.has(edge.id)

    return [{
      id: edge.id,
      source: above,
      target: below,
      ...(asked ? { label: edge.type } : {}),
      style: {
        stroke: paint,
        strokeWidth: SURVEY_STROKE,
        ...(style.dash === undefined ? {} : { strokeDasharray: style.dash }),
        ...(emphasis === 'dimmed' ? { opacity: DIMMED } : {}),
      },
      ...marks(style, edge, above),
      labelStyle: { fill: paint, fontSize: 11 },
      labelBgStyle: { fill: 'var(--canvas)' },
    }]
  })
}

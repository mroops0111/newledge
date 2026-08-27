import type { Edge } from '@xyflow/react'
import type { Attention } from '../lib/attention.js'
import { DIMMED, emphasisOf } from '../lib/attention.js'
import { edgeStyle, SURVEY_STROKE, TONE_COLOURS } from '../lib/boardStyle.js'
import type { GraphEdge, GraphNode } from '../lib/graph.js'
import { ranked } from '../lib/layout.js'
import { worded } from '../lib/naming.js'
import { markEnds } from './BoardMarkers.js'

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
      type: 'line',
      source: above,
      target: below,
      ...(asked ? { label: worded(edge.type) } : {}),
      style: {
        stroke: paint,
        strokeWidth: SURVEY_STROKE,
        ...(style.dash === undefined ? {} : { strokeDasharray: style.dash }),
        ...(emphasis === 'dimmed' ? { opacity: DIMMED } : {}),
      },
      ...markEnds(style, style.tone, { from: edge.fromNodeId, to: edge.toNodeId }, below),
    }]
  })
}

import { Handle, Position } from '@xyflow/react'
import { DIMMED } from '../lib/attention.js'
import type { GraphNode } from '../lib/graph.js'
import { KindBadge } from './KindBadge.js'

export interface NodeCardData {
  readonly node: GraphNode
  readonly colour: string
  readonly selected: boolean
  /** Whether this card stands back, because a reader is looking elsewhere. */
  readonly dimmed: boolean
  [key: string]: unknown
}

/**
 * A node on the survey, which is a card small enough that the graph fits.
 *
 * A board draws a card to be read through and a survey draws one to be found,
 * so this carries the kind, the name, and two lines of what it is about,
 * and stops. What it is short of is read in the panel beside the canvas,
 * which is where a reader goes once they have found the thing.
 *
 * The kind is worn as the badge every surface wears, in the kind's own colour,
 * so a reader can pick every card of one kind out without reading any of them.
 * The colour is said once, on the badge,
 * rather than again down the card's edge,
 * since a second patch of the same colour says nothing the first did not.
 *
 * The type does not hold its size against the canvas the way a board's does.
 * A board card is wide enough to grow type inside, and this one is not,
 * so type grown here runs out of the card rather than out of reach.
 * A survey read from too far out is zoomed back into,
 * which is a turn of the wheel rather than a thing the card has to solve.
 */
export function NodeCard({ data }: { data: NodeCardData }): React.JSX.Element {
  const { node, colour, selected, dimmed } = data
  const lift = selected ? 'shadow-lifted ring-1 ring-ink/25' : 'shadow-card'

  return (
    <div
      className={`w-[200px] overflow-hidden rounded-card border border-line bg-surface ${lift}`}
      style={{ opacity: dimmed ? DIMMED : 1 }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div className="px-3 py-2">
        <p className="mb-1"><KindBadge kind={node.type} colour={colour} /></p>
        <p className="truncate font-ui text-prose-sm font-semibold text-ink">{node.name}</p>
        {node.description !== undefined && (
          // Two lines rather than one cut short,
          // since a line always ending in an ellipsis says only there was more,
          // which a reader knew.
          <p className="mt-1 line-clamp-2 font-reading text-label leading-snug text-ink-muted">
            {node.description}
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  )
}

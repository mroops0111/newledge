import { Handle, Position } from '@xyflow/react'
import type { GraphNode } from '../lib/graph.js'

export interface NodeCardData {
  readonly node: GraphNode
  readonly colour: string
  readonly selected: boolean
  [key: string]: unknown
}

/**
 * A node on the board is a card, not a box.
 * A reader arranges these to hold what they understand,
 * so each one carries enough of the thing to be recognised without opening it.
 * The colour comes from the ontology, so a type it adds is drawn without asking.
 */
export function NodeCard({ data, isConnectable }: {
  data: NodeCardData
  isConnectable: boolean
}): React.JSX.Element {
  const { node, colour, selected } = data
  const ring = selected ? 'shadow-lifted ring-1 ring-ink/20' : 'shadow-card'
  return (
    <div className={`w-60 rounded-card border border-line bg-surface ${ring}`}>
      {isConnectable && <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-line-strong" />}
      <div className="rounded-t-card border-l-2 px-3 py-2" style={{ borderLeftColor: colour }}>
        <p className="truncate font-ui text-xs font-semibold text-ink">{node.name}</p>
      </div>
      {node.description !== undefined && (
        // The clamp has to sit on the text itself, since hidden overflow is cut
        // at the padding edge and a fourth line would show through the padding.
        <div className="px-3 pb-3">
          <p className="line-clamp-3 font-reading text-[0.8125rem] leading-snug text-ink-muted">
            {node.description}
          </p>
        </div>
      )}
      {isConnectable && <Handle type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-line-strong" />}
    </div>
  )
}

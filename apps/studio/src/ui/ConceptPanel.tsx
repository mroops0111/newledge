import { edgeStyle } from '../lib/boardStyle.js'
import type { GraphEdge, GraphNode } from '../lib/graph.js'
import type { Said } from '../lib/kinship.js'
import { gatheredSaid, saidAs } from '../lib/kinship.js'
import { GroupLabel } from './Surface.js'

export interface Inside {
  /** How this concept stands to every other one, in the words the cards use. */
  readonly relations: readonly Said[]
  readonly claims: readonly GraphNode[]
  readonly sources: readonly GraphNode[]
  readonly disputes: ReadonlyMap<string, readonly GraphNode[]>
  readonly agrees: ReadonlyMap<string, readonly GraphNode[]>
}

/**
 * What a concept holds, gathered from the relations that point at it.
 * A board is for the things a reader thinks with,
 * so what is asserted about one of them, and where that came from,
 * is read inside it rather than drawn beside it.
 */
export function inside(
  node: GraphNode,
  graph: { nodes: readonly GraphNode[], edges: readonly GraphEdge[] },
): Inside {
  const byId = new Map(graph.nodes.map(one => [one.id, one]))
  const found = (id: string): GraphNode | undefined => byId.get(id)

  const claims = graph.edges
    .filter(edge => edge.type === 'concerns' && edge.toNodeId === node.id)
    .flatMap(edge => found(edge.fromNodeId) ?? [])
  const claimIds = new Set(claims.map(claim => claim.id))

  const sources = dedupe(graph.edges
    .filter(edge => edge.type === 'introduces' && (edge.toNodeId === node.id || claimIds.has(edge.toNodeId)))
    .flatMap(edge => found(edge.fromNodeId) ?? []))

  return {
    relations: standing(node, graph.edges, found),
    claims,
    sources,
    disputes: between(graph, claimIds, 'contradicts', found),
    agrees: between(graph, claimIds, 'supports', found),
  }
}

/**
 * The relations this panel has to write out, since nothing else here says them.
 * What is asserted about a concept, and where that came from,
 * get sections of their own further down,
 * so saying them again here would have a reader read one relation twice.
 */
const SPOKEN_IN_A_SECTION: Readonly<Record<string, true>> = {
  concerns: true,
  introduces: true,
}

/**
 * How a concept stands to everything the graph attaches to it.
 * A card carries only what fits on it,
 * and a relation the board could not draw is nowhere on the board at all,
 * so this is the one place every one of them can be read at once.
 *
 * The relations the board builds its hierarchy from lead,
 * since being part of something places a concept, and being used does not.
 */
function standing(
  node: GraphNode,
  edges: readonly GraphEdge[],
  found: (id: string) => GraphNode | undefined,
): Said[] {
  const touching = edges
    .filter(edge => edge.fromNodeId === node.id || edge.toNodeId === node.id)
    .filter(edge => !(SPOKEN_IN_A_SECTION[edge.type] === true && edge.toNodeId === node.id))
  const structural = (edge: GraphEdge): number => edgeStyle(edge.type).kin === 'tree' ? 0 : 1

  return gatheredSaid(touching
    .sort((one, other) => structural(one) - structural(other))
    .flatMap((edge) => {
      const from = edge.fromNodeId === node.id
      const other = found(from ? edge.toNodeId : edge.fromNodeId)
      return other === undefined
        ? []
        : [{ phrase: saidAs(edge.type, from ? 'from' : 'to'), name: other.name }]
    }))
}

/** Which of a concept's claims each of its claims argues with, either way. */
function between(
  graph: { edges: readonly GraphEdge[] },
  claimIds: ReadonlySet<string>,
  type: string,
  found: (id: string) => GraphNode | undefined,
): Map<string, GraphNode[]> {
  const paired = new Map<string, GraphNode[]>()
  for (const edge of graph.edges) {
    if (edge.type !== type)
      continue
    for (const [one, other] of [[edge.fromNodeId, edge.toNodeId], [edge.toNodeId, edge.fromNodeId]]) {
      const opposite = found(other!)
      if (!claimIds.has(one!) || opposite === undefined)
        continue
      paired.set(one!, [...(paired.get(one!) ?? []), opposite])
    }
  }
  return paired
}

function dedupe(nodes: readonly GraphNode[]): GraphNode[] {
  return [...new Map(nodes.map(node => [node.id, node])).values()]
}

export function ConceptPanel({ node, held }: { node: GraphNode, held: Inside }): React.JSX.Element {
  return (
    <div className="w-96 overflow-y-auto px-6 py-7">
      <p className="font-ui text-title font-semibold text-ink">{node.name}</p>
      {node.description !== undefined && (
        <p className="mt-2 font-reading text-prose-sm text-ink-muted">
          {node.description}
        </p>
      )}

      {held.relations.length > 0 && (
        <div className="mt-7">
          <GroupLabel>Relations</GroupLabel>
          <ul className="mt-3 space-y-2">
            {held.relations.map(said => (
              <li key={said.phrase} className="font-ui text-prose-sm leading-snug text-ink">
                <span className="text-ink-subtle">{`${said.phrase} `}</span>
                {said.names.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {held.claims.length > 0 && (
        <div className="mt-7">
          <GroupLabel>Claims</GroupLabel>
          <ul className="mt-3 space-y-3">
            {held.claims.map(claim => (
              <li key={claim.id} className="border-l-2 border-claim pl-3">
                <p className="font-reading text-prose-sm text-ink">{claim.name}</p>
                {argued('Disputed by', held.disputes.get(claim.id), 'text-contradicts')}
                {argued('Backed by', held.agrees.get(claim.id), 'text-supports')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {held.sources.length > 0 && (
        <div className="mt-7">
          <GroupLabel>Sources</GroupLabel>
          <ul className="mt-3 space-y-2">
            {held.sources.map(source => (
              <li key={source.id} className="font-ui text-prose-sm leading-snug text-ink-muted">
                {source.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function argued(
  label: string,
  others: readonly GraphNode[] | undefined,
  tone: string,
): React.JSX.Element | false {
  return others !== undefined && others.length > 0 && (
    <ul className="mt-1.5 space-y-1">
      {others.map(other => (
        <li key={other.id} className={`font-ui text-label leading-snug ${tone}`}>
          {`${label}: ${other.name}`}
        </li>
      ))}
    </ul>
  )
}

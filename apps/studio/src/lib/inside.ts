import { edgeStyle } from './boardStyle.js'
import type { GraphEdge, GraphNode } from './graph.js'
import { sourcesOf } from './graph.js'
import type { Said } from './kinship.js'
import { gatheredSaid, saidAs } from './kinship.js'
import { hostOf } from './naming.js'

/**
 * Where something came from, with as much of it as the graph knows.
 * A source the graph made a node of has a name a reader recognises,
 * and one that is only a reference has nothing but where it points,
 * so a name is always there and a link is there when there is one.
 */
export interface Cited {
  readonly id: string
  readonly name: string
  readonly url?: string
}

export interface Inside {
  /** How this node stands to every other one, in the words the cards use. */
  readonly relations: readonly Said[]
  readonly claims: readonly GraphNode[]
  readonly sources: readonly Cited[]
  readonly disputes: ReadonlyMap<string, readonly GraphNode[]>
  readonly agrees: ReadonlyMap<string, readonly GraphNode[]>
}

/**
 * What one node holds, gathered from the relations that point at it.
 *
 * Both canvases draw a node as something to be recognised rather than read,
 * a board because a card carries only what fits on it,
 * and a survey because it draws only the relations a reader has turned on.
 * Either way there is more attached to a node than is on the canvas,
 * and this is where a reader who has picked one reads the rest of it.
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

  return {
    relations: standing(node, graph.edges, found),
    claims,
    sources: cameFrom(node, graph.edges, claimIds, found),
    disputes: between(graph, claimIds, 'contradicts', found),
    agrees: between(graph, claimIds, 'supports', found),
  }
}

/**
 * The relations this has to write out, since nothing else here says them.
 * What is asserted about a node, and where that came from,
 * get sections of their own further down,
 * so saying them again here would have a reader read one relation twice.
 */
const SPOKEN_IN_A_SECTION: Readonly<Record<string, true>> = {
  concerns: true,
  introduces: true,
}

/**
 * How a node stands to everything the graph attaches to it.
 * A card carries only what fits on it,
 * and a relation neither canvas drew is nowhere on either of them,
 * so this is the one place every one of them can be read at once.
 *
 * The relations a hierarchy is built from lead,
 * since being part of something places a node, and being used does not.
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

/** A source the graph made a node of, and wherever that node points. */
function citedAs(source: GraphNode): Cited {
  const [uri] = sourcesOf(source)
  return { id: source.id, name: source.name, ...(uri === undefined ? {} : { url: uri }) }
}

/**
 * Where a node and everything asserted about it came from.
 *
 * A claim's provenance is the node's own as far as a reader is concerned,
 * since the claim is read here rather than anywhere else.
 *
 * A node can also reference something the graph never made a node of,
 * which is still where it came from and is still worth opening,
 * so those are kept, under the only name they have, which is where they point.
 */
function cameFrom(
  node: GraphNode,
  edges: readonly GraphEdge[],
  claimIds: ReadonlySet<string>,
  found: (id: string) => GraphNode | undefined,
): readonly Cited[] {
  const introduced = edges
    .filter(edge => edge.type === 'introduces'
      && (edge.toNodeId === node.id || claimIds.has(edge.toNodeId)))
    .flatMap(edge => found(edge.fromNodeId) ?? [])
    .map(citedAs)

  const linked = new Set(introduced.flatMap(one => one.url ?? []))
  const bare = sourcesOf(node)
    .filter(uri => !linked.has(uri))
    .map(uri => ({ id: uri, name: hostOf(uri), url: uri }))

  return [...new Map([...introduced, ...bare].map(one => [one.id, one])).values()]
}

/** Which of a node's claims each of its claims argues with, either way. */
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

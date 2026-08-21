export interface GraphNode {
  readonly id: string
  readonly type: string
  readonly name: string
  readonly description?: string
  readonly metadata?: { readonly sourceReferences?: readonly { readonly location?: { readonly uri?: string } }[] }
}

export interface GraphEdge {
  readonly id: string
  readonly type: string
  readonly fromNodeId: string
  readonly toNodeId: string
}

export interface NodeTypeDescriptor {
  readonly id: string
  readonly label?: unknown
  readonly color?: string
}

export interface EdgeTypeDescriptor {
  readonly id: string
}

/** The type sets an ontology declares, which is what the board draws itself from. */
export interface Ontology {
  readonly nodeTypes: readonly NodeTypeDescriptor[]
  readonly edgeTypes: readonly EdgeTypeDescriptor[]
}

/** Which types a reader has chosen to see. */
export interface GraphView {
  readonly nodeTypes: ReadonlySet<string>
  readonly edgeTypes: ReadonlySet<string>
}

export interface VisibleGraph {
  readonly nodes: readonly GraphNode[]
  readonly edges: readonly GraphEdge[]
}

/**
 * Decide what the graph draws, from the types a reader has turned on.
 * A node is drawn when its own type is on, or when a drawn relation reaches it,
 * so asking for contradictions brings the claims in dispute along with them,
 * and dropping the relation takes those claims away again.
 * Nothing is special-cased by type, so an ontology can add one and be drawn.
 */
export function visibleGraph(graph: VisibleGraph, view: GraphView): VisibleGraph {
  const byId = new Map(graph.nodes.map(node => [node.id, node]))
  const edges = graph.edges.filter(edge =>
    view.edgeTypes.has(edge.type) && byId.has(edge.fromNodeId) && byId.has(edge.toNodeId),
  )

  const drawn = new Set<string>()
  for (const node of graph.nodes) {
    if (view.nodeTypes.has(node.type))
      drawn.add(node.id)
  }
  for (const edge of edges) {
    drawn.add(edge.fromNodeId)
    drawn.add(edge.toNodeId)
  }

  return { nodes: graph.nodes.filter(node => drawn.has(node.id)), edges }
}

/**
 * The view a reader starts from, read off the ontology rather than written here.
 * Concepts and the themes they sit under carry the shape of the graph.
 * Contradictions come too, since a disagreement is the reason to look.
 * Everything else is a toggle away.
 */
const OPENING_EDGE_TYPES = ['extends', 'instantiates', 'contains', 'uses', 'relatesTo', 'belongsTo', 'contradicts']
const OPENING_NODE_TYPES = ['Concept', 'Topic']

export function openingView(ontology: Ontology): GraphView {
  const declared = <T extends { id: string }>(types: readonly T[], wanted: readonly string[]): Set<string> =>
    new Set(types.map(type => type.id).filter(id => wanted.includes(id)))
  return {
    nodeTypes: declared(ontology.nodeTypes, OPENING_NODE_TYPES),
    edgeTypes: declared(ontology.edgeTypes, OPENING_EDGE_TYPES),
  }
}

/** Toggle one type without disturbing the rest of the view. */
export function withType(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(set)
  if (!next.delete(id))
    next.add(id)
  return next
}

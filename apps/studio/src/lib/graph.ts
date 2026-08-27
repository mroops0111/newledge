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

/** The type sets an ontology declares, which a view is drawn from. */
export interface Ontology {
  readonly nodeTypes: readonly NodeTypeDescriptor[]
  readonly edgeTypes: readonly EdgeTypeDescriptor[]
}

/**
 * Where a node says it came from.
 * Provenance arrives as a list of references,
 * each of which may or may not have got as far as a location,
 * so what is left once the locations are asked for is what there is.
 */
export function sourcesOf(node: GraphNode): readonly string[] {
  return (node.metadata?.sourceReferences ?? [])
    .map(reference => reference.location?.uri)
    .filter((uri): uri is string => uri !== undefined)
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
 *
 * The kinds decide what stands on the canvas,
 * and the relations decide what is drawn between whatever is standing there.
 * Neither can reach in for the other.
 *
 * A relation that drew its own two ends made the kinds advisory,
 * since a reader who turned every kind off still had a canvas full of cards,
 * and the switch they had just pressed was then not about anything.
 * A reader reads the kinds as saying what is here,
 * so that is what they have to say.
 *
 * Nothing is special-cased by type, so an ontology can add one and be drawn.
 */
export function visibleGraph(graph: VisibleGraph, view: GraphView): VisibleGraph {
  const nodes = graph.nodes.filter(node => view.nodeTypes.has(node.type))
  const standing = new Set(nodes.map(node => node.id))
  const edges = graph.edges.filter(edge =>
    view.edgeTypes.has(edge.type)
    && standing.has(edge.fromNodeId)
    && standing.has(edge.toNodeId),
  )

  return { nodes, edges }
}

/**
 * The view a reader starts from,
 * read off the ontology rather than written here.
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

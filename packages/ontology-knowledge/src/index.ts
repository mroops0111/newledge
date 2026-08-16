import type { EdgeTypeDescriptor, NodeTypeDescriptor } from '@braidhq/core'
import type { EdgeTypeId, NodeTypeId, SourceRoleInput } from '@braidhq/sdk'
import { defineOntologyPlugin } from '@braidhq/sdk'

/** The ontology id this plugin declares. */
export const ONTOLOGY_ID = 'knowledge' as const

type Cardinality = NonNullable<EdgeTypeDescriptor['cardinality']>

// Builders keep the type sets declarative,
// a node, edge, or role is one entry in the arrays below,
// so adding one extends data rather than editing a closed union.
// The branded ids are cast here, the single place a raw string becomes an id.
function node(id: string, label: string, description: string, color: string): NodeTypeDescriptor {
  return { id: id as NodeTypeId, label, description, color }
}

function edge(
  id: string,
  label: string,
  description: string,
  fromTypes: readonly string[],
  toTypes: readonly string[],
  cardinality: Cardinality,
): EdgeTypeDescriptor {
  return {
    id: id as EdgeTypeId,
    label,
    description,
    fromTypes: fromTypes.map(t => t as NodeTypeId),
    toTypes: toTypes.map(t => t as NodeTypeId),
    cardinality,
  }
}

function role(id: string, label: string, extra: Omit<SourceRoleInput, 'id' | 'label'> = {}): SourceRoleInput {
  return { id, label, ...extra }
}

const nodeTypes: readonly NodeTypeDescriptor[] = [
  node('Concept', 'Concept', 'A durable unit of knowledge, an idea, a technique, or a definition. The dominant node type.', '#7c3aed'),
  node('Claim', 'Claim', 'A specific assertion with a truth value the user can accept, reject, or contest. Carries provenance to the exact source moment.', '#ef4444'),
  node('Source', 'Source', 'An ingested artifact (a web page, article, video, or podcast) with its metadata. The anchor every claim traces back to.', '#0ea5e9'),
  node('Topic', 'Topic', 'A named grouping or theme, a concept-map section made first-class: reusable, nestable, and many-to-many, so a node can sit under several topics.', '#f59e0b'),
]

const edgeTypes: readonly EdgeTypeDescriptor[] = [
  // Every edge is an active, present-tense verb read "from verb to".
  // Each has one canonical direction.
  // How a line is drawn on a whiteboard is a separate view concern,
  // the board maps onto these edges.

  // Hierarchy is is-a, instance-of, part-of.
  // Kept distinct (ISO 25964) because is-a chains stay transitive,
  // but mixing part-of does not.
  edge('extends', 'extends', 'A concept is a specialization or kind of another (is-a), e.g. GraphRAG extends RAG.', ['Concept'], ['Concept'], 'N:N'),
  edge('instantiates', 'instantiates', 'A concept is a concrete instance of a type concept, e.g. GPT-4 instantiates FoundationModel.', ['Concept'], ['Concept'], 'N:N'),
  edge('contains', 'contains', 'A concept contains another as a component, from whole to part.', ['Concept'], ['Concept'], 'N:N'),

  // Association is a named dependency plus a catch-all.
  // Reach for uses first, and fall back to relatesTo
  // only when no more specific edge fits (the stop rule).
  edge('uses', 'uses', 'A concept functionally depends on another, e.g. RAG uses Embedding.', ['Concept'], ['Concept'], 'N:N'),
  edge('relatesTo', 'relates to', 'A generic association, the catch-all used only when no more specific edge fits.', ['Concept'], ['Concept'], 'N:N'),

  // Categorization: membership under a topic, or a topic nested under a topic.
  edge('belongsTo', 'belongs to', 'A node is filed under a topic, or a topic nests under a topic. Many-to-many.', ['Concept', 'Claim', 'Topic'], ['Topic'], 'N:N'),

  // Provenance: the source that first established a node.
  edge('introduces', 'introduces', 'The source that first established a node; nothing durable exists without one.', ['Source'], ['Concept', 'Claim'], '1:N'),

  // Argument: how claims relate (Toulmin plus conceptual change).
  edge('supports', 'supports', 'One claim corroborates another, possibly across sources. The convergence signal in place of a ground truth.', ['Claim'], ['Claim'], 'N:N'),
  edge('contradicts', 'contradicts', 'One claim conflicts with another, surfaced rather than force-merged, because conflict drives learning.', ['Claim'], ['Claim'], 'N:N'),
]

// `feed` is the external content extracted from,
// enumerated into batch units whose sync drives the Reactor.
// `stance` is the user's own sparse authored input.
const sourceRoles: readonly SourceRoleInput[] = [
  role('feed', 'Feed', { unitBearing: true, pathSegment: 'feeds' }),
  role('stance', 'Stance', { pathSegment: 'stances' }),
]

/**
 * The knowledge ontology, declared as a third-party braid plugin.
 * Node, edge, and source-role types are passed as data to `defineOntologyPlugin`,
 * which auto-attaches the framework's OntologyTypeValidator and StructuralValidator.
 * Endpoints, cardinality, and duplicate ids are checked at build time,
 * so a mistyped or reversed edge throws from this file rather than failing silently at runtime.
 */
export const knowledgeOntology = defineOntologyPlugin({
  ontologyId: ONTOLOGY_ID,
  nodeTypes,
  edgeTypes,
  sourceRoles,
})

import type { EdgeTypeDescriptor, NodeTypeDescriptor } from '@braidhq/core'
import type { EdgeTypeId, NodeTypeId, SourceRoleInput } from '@braidhq/sdk'
import { defineOntologyPlugin } from '@braidhq/sdk'

/** The ontology id this plugin declares. */
export const ONTOLOGY_ID = 'knowledge' as const

type Cardinality = NonNullable<EdgeTypeDescriptor['cardinality']>

// Builders keep the type sets declarative: a node, edge, or role is one entry in
// the arrays below, so adding one extends data rather than editing a closed union.
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
  node('Concept', 'Concept', 'A durable unit of knowledge — an idea, a technique, a definition. The dominant node type.', '#7c3aed'),
  node('Claim', 'Claim', 'A specific assertion with a truth value the user can accept, reject, or contest. Carries provenance to the exact source moment.', '#ef4444'),
  node('Source', 'Source', 'An ingested artifact — a web page, article, video, or podcast — with its metadata. The anchor every claim traces back to.', '#0ea5e9'),
]

const edgeTypes: readonly EdgeTypeDescriptor[] = [
  edge('introducedBy', 'introduced by', 'The source that first established this node. The provenance edge; nothing durable exists without one.', ['Concept', 'Claim'], ['Source'], 'N:1'),
  edge('cites', 'cites', 'The source a claim draws its evidence from, ideally down to a media fragment.', ['Claim'], ['Source'], 'N:N'),
  edge('supports', 'supports', 'One claim corroborates another, possibly across sources. The convergence signal a large brain leans on in place of a ground truth.', ['Claim'], ['Claim'], 'N:N'),
  edge('contradicts', 'contradicts', 'One claim conflicts with another. The signal that surfaces cross-source disagreement instead of silently force-merging it.', ['Claim'], ['Claim'], 'N:N'),
]

// `feed` is the external content extracted from, enumerated into batch units whose
// sync drives the Reactor. `stance` is the user's own sparse authored input.
const sourceRoles: readonly SourceRoleInput[] = [
  role('feed', 'Feed', { unitBearing: true, pathSegment: 'feeds' }),
  role('stance', 'Stance', { pathSegment: 'stances' }),
]

/**
 * The knowledge ontology, declared as a third-party braid plugin. Node, edge, and
 * source-role types are passed as data to `defineOntologyPlugin`, which auto-attaches
 * the framework's OntologyTypeValidator and StructuralValidator. Endpoints, cardinality,
 * and duplicate ids are checked at build time, so a mistyped or reversed edge throws
 * from this file rather than failing silently at runtime.
 */
export const knowledgeOntology = defineOntologyPlugin({
  ontologyId: ONTOLOGY_ID,
  nodeTypes,
  edgeTypes,
  sourceRoles,
})

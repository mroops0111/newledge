import type { EdgeTypeDescriptor, NodeTypeDescriptor } from '@braidhq/core'
import type { EdgeTypeId, NodeTypeId, SourceRoleInput } from '@braidhq/sdk'
import { SkillId } from '@braidhq/schema'
import { defineOntologyPlugin } from '@braidhq/sdk'

export const ONTOLOGY_ID = 'knowledge' as const

type Cardinality = NonNullable<EdgeTypeDescriptor['cardinality']>

// Builders keep the type sets declarative, one entry per node, edge, or role,
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
  node('Topic', 'Topic', 'A named grouping or theme, a concept-map section made first-class, reusable, nestable, and many-to-many, so a node can sit under several topics.', '#f59e0b'),
]

const edgeTypes: readonly EdgeTypeDescriptor[] = [
  // Every edge is an active present-tense verb read "from verb to" with one direction.
  // How a line is drawn on a whiteboard is a view concern mapped onto these edges.

  // Is-a, instance-of, and part-of stay distinct (ISO 25964),
  // because is-a chains are transitive but part-of chains are not.
  // These two are close enough to be mixed up, so each says how to tell them
  // apart. The test is whether the narrower end could itself have kinds.
  edge('extends', 'extends', 'A kind of another concept (is-a), where both ends are categories, e.g. GraphRAG extends RAG. Use this when "all X" makes sense, because X could have kinds of its own.', ['Concept'], ['Concept'], 'N:N'),
  edge('instantiates', 'instantiates', 'One particular thing of a kind (instance-of), where the narrow end is an individual and the wide end a category, e.g. GPT-4 instantiates FoundationModel. Use this when "all X" makes no sense, because there is only one X.', ['Concept'], ['Concept'], 'N:N'),
  edge('contains', 'contains', 'A concept contains another as a component, from whole to part.', ['Concept'], ['Concept'], 'N:N'),

  // Association is a named dependency plus a catch-all, reach for uses first,
  // and fall back to relatesTo when no more specific edge fits (the stop rule).
  edge('uses', 'uses', 'A concept functionally depends on another, e.g. RAG uses Embedding.', ['Concept'], ['Concept'], 'N:N'),
  edge('relatesTo', 'relates to', 'A generic association, the catch-all used only when no more specific edge fits.', ['Concept'], ['Concept'], 'N:N'),

  // Categorization, membership under a topic, or a topic nested under a topic.
  edge('belongsTo', 'belongs to', 'A node is filed under a topic, or a topic nests under a topic. Many-to-many.', ['Concept', 'Claim', 'Topic'], ['Topic'], 'N:N'),

  // Provenance, the source that first established a node.
  edge('introduces', 'introduces', 'The source that first established a node. Nothing durable exists without one.', ['Source'], ['Concept', 'Claim'], '1:N'),

  // Aboutness, the subject a claim speaks to.
  // SKOS has no name for it because SKOS models concepts alone,
  // so this follows IAO's is_about, written as a verb like every other edge.
  // Without it an assertion has nowhere to go but the concept's own definition.
  edge('concerns', 'concerns', 'The concept a claim asserts something about, e.g. a benchmark result concerns GraphRAG. Assertions attach here rather than swelling a concept description.', ['Claim'], ['Concept'], 'N:N'),

  // Argument, how claims relate (Toulmin plus conceptual change).
  edge('supports', 'supports', 'One claim corroborates another, possibly across sources. The convergence signal in place of a ground truth.', ['Claim'], ['Claim'], 'N:N'),
  edge('contradicts', 'contradicts', 'One claim conflicts with another, surfaced rather than force-merged, because conflict drives learning.', ['Claim'], ['Claim'], 'N:N'),
]

// `feed` is external content enumerated into batch units that drive the Reactor.
// `stance` is the user's own sparse authored input.
const sourceRoles: readonly SourceRoleInput[] = [
  role('feed', 'Feed', { unitBearing: true, pathSegment: 'feeds' }),
  role('stance', 'Stance', { pathSegment: 'stances' }),
]

// SKILL.md prompts shipped with this ontology, run by the agent runtime.
// Each id composes as `<ontologyId>:<directory basename>`,
// so the directory named extract becomes `knowledge:extract`.
function skillDir(verb: string): URL {
  return new URL(`../skills/${verb}`, import.meta.url)
}
function skillId(verb: string): SkillId {
  return SkillId.parse(`${ONTOLOGY_ID}:${verb}`)
}

const DEFAULT_CLAIMS_PER_CONCEPT = 7

/**
 * How many claims a concept keeps once convergence has weighed them.
 * Sources repeat each other, so claims accrue faster than understanding does,
 * and a concept buried under its own evidence is harder to learn from.
 * Extraction stays free to propose, and the trimming happens at the checkpoint.
 * Read at call time rather than at import, so a deployment can set it.
 */
function claimsPerConcept(): string {
  return process.env.NEWLEDGE_CLAIMS_PER_CONCEPT ?? String(DEFAULT_CLAIMS_PER_CONCEPT)
}

/**
 * The knowledge ontology, declared as a third-party braid plugin.
 * Node, edge, and source-role types are passed as data to `defineOntologyPlugin`,
 * which auto-attaches the framework's OntologyTypeValidator and StructuralValidator.
 * Endpoints, cardinality, and duplicate ids are checked at build time,
 * so a mistyped or reversed edge throws from this file, not silently at runtime.
 */
export const knowledgeOntology = defineOntologyPlugin({
  ontologyId: ONTOLOGY_ID,
  nodeTypes,
  edgeTypes,
  sourceRoles,

  skills: [
    { directory: skillDir('extract') },
    { directory: skillDir('converge') },
    { directory: skillDir('clarify') },
  ],

  // Shared vocabulary and wiring rules every skill above consults,
  // mounted into each skill session so the ontology contract lives in one place.
  referenceDir: new URL('../skills/shared', import.meta.url),

  // Batch and reactor binding. `knowledge:extract` runs once per unit,
  // and the checkpoint `knowledge:converge` fires every five successful extracts,
  // then once more at the end for a graph-wide pass.
  // There is no deriveUnits, a feed source already writes the unit it yields.
  batch: {
    perUnit: {
      skillId: skillId('extract'),
      label: 'Extract',
    },
    checkpoint: {
      skillId: skillId('converge'),
      label: 'Converge',
      chunkSize: 5,
      runAtEnd: true,
      extraEnv: () => ({ NEWLEDGE_CLAIMS_PER_CONCEPT: claimsPerConcept() }),
    },
  },
})

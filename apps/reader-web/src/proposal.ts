export interface GraphNodePayload {
  readonly id: string
  readonly type: string
  readonly name?: string
  readonly description?: string
  readonly metadata?: { readonly sourceReferences?: readonly SourceReference[] }
}

export interface SourceReference {
  readonly sourceId?: string
  readonly location?: { readonly uri?: string }
}

export interface GraphEdgePayload {
  readonly id?: string
  readonly type: string
  readonly fromNodeId: string
  readonly toNodeId: string
}

export interface GraphOperation {
  readonly operation: string
  readonly payload?: unknown
  readonly payloads?: readonly unknown[]
}

export interface Proposal {
  readonly id: string
  readonly status: string
  readonly generatedBy: string
  readonly rationale: string
  readonly operations: readonly GraphOperation[]
}

/** A concept together with the claims that concern it, the unit a reader absorbs. */
export interface ConceptReading {
  readonly concept: GraphNodePayload
  readonly claims: readonly GraphNodePayload[]
}

/** A theme and what sits under it, the outline a reader navigates by. */
export interface TopicGroup {
  readonly id: string
  readonly title: string
  readonly readings: readonly ConceptReading[]
}

/** One page a reading came from, named rather than reduced to its host. */
export interface SourceLink {
  readonly id: string
  readonly title: string
  readonly url?: string
}

/** One proposal rendered as a reading card, what a source is asking you to absorb. */
export interface ProposalCard {
  readonly id: string
  readonly rationale: string
  readonly generatedBy: string
  /** Themes in order, with whatever belongs to none of them coming last. */
  readonly groups: readonly TopicGroup[]
  /** Claims that concern no concept in this proposal, so they still need a home. */
  readonly looseClaims: readonly GraphNodePayload[]
  readonly conceptCount: number
  readonly claimCount: number
  readonly sources: readonly SourceLink[]
  readonly edges: readonly GraphEdgePayload[]
}

function isEdgePayload(value: unknown): value is GraphEdgePayload {
  if (typeof value !== 'object' || value === null)
    return false
  const candidate = value as Partial<GraphEdgePayload>
  return typeof candidate.fromNodeId === 'string' && typeof candidate.toNodeId === 'string'
}

function isNodePayload(value: unknown): value is GraphNodePayload {
  if (typeof value !== 'object' || value === null)
    return false
  const candidate = value as Partial<GraphNodePayload>
  return typeof candidate.id === 'string' && typeof candidate.type === 'string'
}

// braid sends one node or edge under `payload`, and a batch under `payloads`,
// so both shapes flatten to one list before the card groups them by type.
function itemsOf(operation: GraphOperation): readonly unknown[] {
  return operation.payloads ?? (operation.payload === undefined ? [] : [operation.payload])
}

// A source is named by its title, since several pages of one search can share a
// host, and two identical hosts tell a reader nothing about which page is which.
function toSourceLinks(sources: readonly GraphNodePayload[]): readonly SourceLink[] {
  return sources.map(source => ({
    id: source.id,
    title: source.name ?? source.id,
    ...(uriOf(source) === undefined ? {} : { url: uriOf(source) }),
  }))
}

function uriOf(node: GraphNodePayload): string | undefined {
  return node.metadata?.sourceReferences?.[0]?.location?.uri
}

/**
 * Turn a proposal's raw graph operations into a readable card.
 * Reading is the point, so the card carries what the proposal says,
 * and where each claim came from, rather than the operations that would write it.
 */
export function toCard(proposal: Proposal): ProposalCard {
  const nodes: GraphNodePayload[] = []
  const edges: GraphEdgePayload[] = []
  for (const operation of proposal.operations) {
    for (const item of itemsOf(operation)) {
      if (isEdgePayload(item))
        edges.push(item)
      else if (isNodePayload(item))
        nodes.push(item)
    }
  }
  const ofType = (type: string): GraphNodePayload[] => nodes.filter(node => node.type === type)
  const concepts = ofType('Concept')
  const claims = ofType('Claim')
  const { readings, looseClaims } = groupByConcept(concepts, claims, edges)
  return {
    id: proposal.id,
    rationale: proposal.rationale,
    generatedBy: proposal.generatedBy,
    groups: groupByTopic(readings, ofType('Topic'), edges),
    looseClaims,
    conceptCount: concepts.length,
    claimCount: claims.length,
    sources: toSourceLinks(ofType('Source')),
    edges,
  }
}

const UNGROUPED = 'ungrouped'

/**
 * Sort the concepts under the themes they belong to, which is the outline a
 * reader navigates by, and the only place topics are visible at all.
 * A concept under no theme still has to be read, so it lands in a final group.
 */
function groupByTopic(
  readings: readonly ConceptReading[],
  topics: readonly GraphNodePayload[],
  edges: readonly GraphEdgePayload[],
): readonly TopicGroup[] {
  const themesOf = new Map<string, Set<string>>()
  for (const edge of edges) {
    if (edge.type !== 'belongsTo')
      continue
    const themes = themesOf.get(edge.fromNodeId) ?? new Set<string>()
    themes.add(edge.toNodeId)
    themesOf.set(edge.fromNodeId, themes)
  }

  const filed = new Set<string>()
  const groups = topics.map((topic) => {
    const held = readings.filter(reading => themesOf.get(reading.concept.id)?.has(topic.id) === true)
    for (const reading of held)
      filed.add(reading.concept.id)
    return { id: topic.id, title: topic.name ?? topic.id, readings: held }
  }).filter(group => group.readings.length > 0)

  const rest = readings.filter(reading => !filed.has(reading.concept.id))
  if (rest.length === 0)
    return groups
  return [...groups, { id: UNGROUPED, title: 'Not filed under a theme', readings: rest }]
}

/**
 * Hang each claim under the concept it concerns, which is how a reader meets it,
 * as an assertion about something rather than as a separate list.
 * A claim can tie several concepts together, since aboutness is many to many,
 * so it is read under each concept it concerns.
 * A claim concerning nothing here is kept aside rather than dropped.
 */
function groupByConcept(
  concepts: readonly GraphNodePayload[],
  claims: readonly GraphNodePayload[],
  edges: readonly GraphEdgePayload[],
): { readings: readonly ConceptReading[], looseClaims: readonly GraphNodePayload[] } {
  const subjectsOf = new Map<string, Set<string>>()
  for (const edge of edges) {
    if (edge.type !== 'concerns')
      continue
    const subjects = subjectsOf.get(edge.fromNodeId) ?? new Set<string>()
    subjects.add(edge.toNodeId)
    subjectsOf.set(edge.fromNodeId, subjects)
  }

  const placed = new Set<string>()
  const readings = concepts.map((concept) => {
    const held = claims.filter(claim => subjectsOf.get(claim.id)?.has(concept.id) === true)
    for (const claim of held)
      placed.add(claim.id)
    return { concept, claims: held }
  })
  return { readings, looseClaims: claims.filter(claim => !placed.has(claim.id)) }
}

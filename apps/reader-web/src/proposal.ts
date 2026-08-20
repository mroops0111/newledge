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

/** One proposal rendered as a reading card, what a source is asking you to absorb. */
export interface ProposalCard {
  readonly id: string
  readonly rationale: string
  readonly generatedBy: string
  readonly readings: readonly ConceptReading[]
  /** Claims that concern no concept in this proposal, so they still need a home. */
  readonly looseClaims: readonly GraphNodePayload[]
  readonly conceptCount: number
  readonly claimCount: number
  readonly sources: readonly GraphNodePayload[]
  readonly topics: readonly GraphNodePayload[]
  readonly edges: readonly GraphEdgePayload[]
  readonly citations: readonly string[]
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

// braid sends one node or edge under `payload`,
// and a batch of them under `payloads`,
// so both shapes flatten to one list before the card groups them by type.
function itemsOf(operation: GraphOperation): readonly unknown[] {
  return operation.payloads ?? (operation.payload === undefined ? [] : [operation.payload])
}

/** Collect the urls a card's claims and concepts trace back to, deduped, order kept. */
function citationsOf(nodes: readonly GraphNodePayload[]): readonly string[] {
  const seen = new Set<string>()
  for (const node of nodes) {
    for (const reference of node.metadata?.sourceReferences ?? []) {
      const uri = reference.location?.uri
      if (uri)
        seen.add(uri)
    }
  }
  return [...seen]
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
    readings,
    looseClaims,
    conceptCount: concepts.length,
    claimCount: claims.length,
    sources: ofType('Source'),
    topics: ofType('Topic'),
    edges,
    citations: citationsOf(nodes),
  }
}

/**
 * Hang each claim under the concept it concerns, which is how a reader meets it,
 * as an assertion about something rather than as a separate list.
 * Aboutness is many to many, so a claim tying several concepts together is read
 * under each of them, and one concerning nothing here is kept aside, not dropped.
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

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

/** One proposal rendered as a reading card, what a source is asking you to absorb. */
export interface ProposalCard {
  readonly id: string
  readonly rationale: string
  readonly generatedBy: string
  readonly concepts: readonly GraphNodePayload[]
  readonly claims: readonly GraphNodePayload[]
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
  return {
    id: proposal.id,
    rationale: proposal.rationale,
    generatedBy: proposal.generatedBy,
    concepts: ofType('Concept'),
    claims: ofType('Claim'),
    sources: ofType('Source'),
    topics: ofType('Topic'),
    edges,
    citations: citationsOf(nodes),
  }
}

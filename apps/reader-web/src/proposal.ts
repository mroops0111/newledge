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

function isEdge(value: Record<string, unknown>): boolean {
  return typeof value.fromNodeId === 'string' && typeof value.toNodeId === 'string'
}

// braid sends a node or edge under `payload`, and a batch of them under `payloads`,
// so both shapes flatten to one list before the card groups them by type.
function itemsOf(operation: GraphOperation): readonly Record<string, unknown>[] {
  const raw = operation.payloads ?? (operation.payload === undefined ? [] : [operation.payload])
  return raw.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
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
 * Reading is the point, so the card leads with what the proposal claims
 * and where each claim came from, not with the operations that would write it.
 */
export function toCard(proposal: Proposal): ProposalCard {
  const nodes: GraphNodePayload[] = []
  const edges: GraphEdgePayload[] = []
  for (const operation of proposal.operations) {
    for (const item of itemsOf(operation)) {
      if (isEdge(item))
        edges.push(item as unknown as GraphEdgePayload)
      else if (typeof item.id === 'string' && typeof item.type === 'string')
        nodes.push(item as unknown as GraphNodePayload)
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

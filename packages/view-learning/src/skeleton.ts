import type { Board } from '@newledge/board'

/**
 * What a skeleton reads of the graph.
 *
 * Written as the least a projection needs rather than as the model's own type,
 * so a caller can hand it a fake without building a whole snapshot,
 * and so a field the model gains cannot change what this depends on.
 * A snapshot satisfies it, since every field named here is one a snapshot has.
 */
export interface Reading {
  readonly nodes: readonly {
    readonly id: string
    readonly type: string
    readonly name: string
    readonly description?: string
    readonly metadata?: { readonly sourceReferences?: readonly { readonly location?: { readonly uri?: string } }[] }
  }[]
  readonly edges: readonly {
    readonly id: string
    readonly type: string
    readonly fromNodeId: string
    readonly toNodeId: string
  }[]
}

/**
 * One thing a reader is asked to understand, with everything asserted about it.
 * A claim carries what argues with it and where it came from,
 * because both are what decides whether a reader should believe it,
 * and a learner reading a claim without either has been told,
 * rather than taught.
 */
export interface Held {
  readonly name: string
  readonly description?: string
  readonly claims: readonly {
    readonly text: string
    readonly disputedBy: readonly string[]
    readonly backedBy: readonly string[]
    readonly sources: readonly string[]
  }[]
}

/**
 * A board laid out as the material a learning view is written from.
 *
 * The order is the reader's own. A board is arranged by hand,
 * so what comes first on it is what they decided comes first,
 * and that is the one thing the graph cannot supply.
 * A document written from the graph has to invent an order,
 * and inventing one is how the same material comes out differently each run.
 */
export interface Skeleton {
  readonly title: string
  readonly held: readonly Held[]
  /** Every source the material rests on, so an answer can be checked. */
  readonly sources: readonly string[]
}

function uriOf(node: Reading['nodes'][number]): string | undefined {
  return node.metadata?.sourceReferences?.[0]?.location?.uri
}

/**
 * Read the board in the order a reader arranged it.
 *
 * A card's place on the canvas is the whole of what it says about order,
 * so it is read down the page and then across,
 * which is the order the same reader would read it back in.
 */
function inReadingOrder(board: Board): readonly string[] {
  return [...board.cards]
    .sort((one, other) => one.y - other.y || one.x - other.x)
    .map(card => card.nodeId)
}

/**
 * Project a board and the graph it names into the material of a learning view.
 *
 * This half is a function on purpose. Which claim sits under which term,
 * what argues with what, and where a figure came from,
 * are decided by the graph rather than by whoever is writing,
 * so settling them in prose is how one run comes out unlike the last.
 * What is left for the writing is the writing.
 */
export function skeletonOf(board: Board, graph: Reading): Skeleton {
  const byId = new Map(graph.nodes.map(node => [node.id, node]))

  const claimsAbout = new Map<string, string[]>()
  const argued = new Map<string, { disputedBy: string[], backedBy: string[] }>()
  const introduced = new Map<string, string[]>()

  for (const edge of graph.edges) {
    if (edge.type === 'concerns')
      claimsAbout.set(edge.toNodeId, [...(claimsAbout.get(edge.toNodeId) ?? []), edge.fromNodeId])
    if (edge.type === 'introduces')
      introduced.set(edge.toNodeId, [...(introduced.get(edge.toNodeId) ?? []), edge.fromNodeId])
    if (edge.type === 'contradicts' || edge.type === 'supports') {
      for (const [one, other] of [[edge.fromNodeId, edge.toNodeId], [edge.toNodeId, edge.fromNodeId]]) {
        const found = argued.get(one!) ?? { disputedBy: [], backedBy: [] }
        const named = byId.get(other!)?.name
        if (named !== undefined)
          (edge.type === 'contradicts' ? found.disputedBy : found.backedBy).push(named)
        argued.set(one!, found)
      }
    }
  }

  const cited = new Set<string>()
  const held = inReadingOrder(board).flatMap((nodeId) => {
    const node = byId.get(nodeId)
    // A board naming a node the graph no longer holds simply has nothing here.
    if (node === undefined || node.type !== 'Concept')
      return []

    const claims = (claimsAbout.get(nodeId) ?? []).flatMap((claimId) => {
      const claim = byId.get(claimId)
      if (claim === undefined)
        return []
      const from = (introduced.get(claimId) ?? [])
        .flatMap(sourceId => uriOf(byId.get(sourceId) ?? { id: '', type: '', name: '' }) ?? [])
      for (const uri of from)
        cited.add(uri)
      const argument = argued.get(claimId) ?? { disputedBy: [], backedBy: [] }
      return [{
        text: claim.name,
        disputedBy: argument.disputedBy,
        backedBy: argument.backedBy,
        sources: from,
      }]
    })

    return [{
      name: node.name,
      ...(node.description === undefined ? {} : { description: node.description }),
      claims,
    }]
  })

  return { title: board.name, held, sources: [...cited] }
}

/** How many cards the board names that the graph no longer holds. */
export function missingFrom(board: Board, graph: Reading): number {
  const known = new Set(graph.nodes.map(node => node.id))
  return board.cards.filter(card => !known.has(card.nodeId)).length
}

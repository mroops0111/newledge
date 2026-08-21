import type { Ontology, GraphEdge, GraphNode } from './graph.js'
import type { Proposal } from './proposal.js'

export interface InboxClientOptions {
  readonly apiUrl: string
  readonly workspaceId: string
  readonly userId?: string
  readonly fetcher?: typeof fetch
}

/** Reads the pending queue and lands or discards one proposal, the absorption gate. */
export interface InboxClient {
  readonly pending: () => Promise<readonly Proposal[]>
  readonly absorb: (proposalId: string) => Promise<void>
  readonly discard: (proposalId: string) => Promise<void>
}

/** Reads what a reader has already absorbed, which is what the board draws. */
export interface GraphClient {
  readonly ontology: () => Promise<Ontology>
  readonly graph: () => Promise<{ nodes: readonly GraphNode[], edges: readonly GraphEdge[] }>
}

const DEFAULT_USER_ID = 'reader'

// The rejection is kept on the proposal, so the reason is a stable code.
// A sentence would put the reader's interface language into the record.
const DISCARD_REASON = 'not-absorbed'

export function createGraphClient(options: InboxClientOptions): GraphClient {
  const fetcher = options.fetcher ?? globalThis.fetch
  const base = `${options.apiUrl.replace(/\/+$/, '')}/workspaces/${options.workspaceId}`

  async function read<T>(path: string, what: string): Promise<T> {
    const response = await fetcher(`${base}${path}`)
    if (!response.ok)
      throw new Error(`Reading the ${what} failed with ${response.status}`)
    return await response.json() as T
  }

  return {
    ontology: () => read<Ontology>('/ontology', 'ontology'),
    graph: async () => {
      const [nodes, edges] = await Promise.all([
        read<{ items?: readonly GraphNode[] }>('/nodes', 'graph'),
        read<{ items?: readonly GraphEdge[] }>('/edges', 'graph'),
      ])
      return { nodes: nodes.items ?? [], edges: edges.items ?? [] }
    },
  }
}

export function createInboxClient(options: InboxClientOptions): InboxClient {
  const fetcher = options.fetcher ?? globalThis.fetch
  const userId = options.userId ?? DEFAULT_USER_ID
  const base = `${options.apiUrl.replace(/\/+$/, '')}/workspaces/${options.workspaceId}/proposals`

  async function send(path: string, body: Record<string, unknown>): Promise<void> {
    const response = await fetcher(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...body }),
    })
    if (!response.ok)
      throw new Error(`Request to "${path}" failed with ${response.status}`)
  }

  return {
    pending: async () => {
      const response = await fetcher(`${base}?status=pending`)
      if (!response.ok)
        throw new Error(`Reading the inbox failed with ${response.status}`)
      const body = await response.json() as { items?: readonly Proposal[] }
      return body.items ?? []
    },
    absorb: proposalId => send(`/${proposalId}/apply`, {}),
    discard: proposalId => send(`/${proposalId}/reject`, { reason: DISCARD_REASON }),
  }
}

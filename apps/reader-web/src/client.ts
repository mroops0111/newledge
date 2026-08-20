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

const DEFAULT_USER_ID = 'reader'

// The rejection is kept on the proposal, so the reason is a stable code rather
// than a sentence, which would put whichever language the reader runs the
// interface in into the record.
const DISCARD_REASON = 'not-absorbed'

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

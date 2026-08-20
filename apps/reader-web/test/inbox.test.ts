import { describe, expect, it } from 'vitest'
import { createInboxClient } from '../src/client.js'
import type { Proposal } from '../src/proposal.js'
import { toCard } from '../src/proposal.js'

const proposal: Proposal = {
  id: 'proposal-1',
  status: 'pending',
  generatedBy: 'knowledge:extract',
  rationale: 'Extracted one Source, two Concepts and one Claim from the report.',
  operations: [
    {
      operation: 'addNode',
      payload: { id: 'vendorSeriesB2021', type: 'Source', name: 'Trade press report' },
    },
    {
      operation: 'addNodes',
      payloads: [
        { id: 'vendor', type: 'Concept', name: 'Vendor', description: 'A software company.' },
        { id: 'signing', type: 'Concept', name: 'Signing' },
        {
          id: 'seriesB16M',
          type: 'Claim',
          name: 'Vendor raised a $16M Series B',
          metadata: { sourceReferences: [{ sourceId: 'vendorSeriesB2021', location: { uri: 'https://example.com/a' } }] },
        },
      ],
    },
    { operation: 'addNode', payload: { id: 'funding', type: 'Topic', name: 'Funding' } },
    { operation: 'addEdge', payload: { type: 'introduces', fromNodeId: 'vendorSeriesB2021', toNodeId: 'vendor' } },
  ],
}

describe('toCard', () => {
  const card = toCard(proposal)

  it('groups a proposal into what it asks you to absorb', () => {
    expect(card.concepts.map(c => c.id)).toEqual(['vendor', 'signing'])
    expect(card.claims.map(c => c.id)).toEqual(['seriesB16M'])
    expect(card.sources.map(s => s.id)).toEqual(['vendorSeriesB2021'])
    expect(card.topics.map(t => t.id)).toEqual(['funding'])
  })

  it('separates edges from nodes', () => {
    expect(card.edges).toEqual([{ type: 'introduces', fromNodeId: 'vendorSeriesB2021', toNodeId: 'vendor' }])
  })

  it('surfaces provenance so a claim can be traced back', () => {
    expect(card.citations).toEqual(['https://example.com/a'])
  })

  it('keeps the rationale as the opening line of the card', () => {
    expect(card.rationale).toContain('Extracted one Source')
  })

  it('tolerates a proposal with no operations', () => {
    expect(toCard({ ...proposal, operations: [] }).concepts).toEqual([])
  })

  it('ignores a payload that is neither a node nor an edge', () => {
    const noise = { operation: 'addNode', payload: null }
    const stray = { operation: 'addNode', payloads: [{ nothing: 'useful' }] }
    const card = toCard({ ...proposal, operations: [noise, stray] })

    expect(card.concepts).toEqual([])
    expect(card.edges).toEqual([])
  })
})

interface Call { url: string, init?: RequestInit }

function recordingFetcher(response: unknown, ok = true): { calls: Call[], fetcher: typeof fetch } {
  const calls: Call[] = []
  const fetcher = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    return { ok, status: ok ? 200 : 500, json: async () => response } as Response
  }) as unknown as typeof fetch
  return { calls, fetcher }
}

describe('inbox client', () => {
  const options = { apiUrl: 'http://localhost:4321', workspaceId: 'knowledge' }

  it('reads only what is still pending', async () => {
    const { calls, fetcher } = recordingFetcher({ items: [proposal] })
    const items = await createInboxClient({ ...options, fetcher }).pending()

    expect(items).toHaveLength(1)
    expect(calls[0]?.url).toBe('http://localhost:4321/workspaces/knowledge/proposals?status=pending')
  })

  it('returns an empty queue when the response carries no items', async () => {
    const { fetcher } = recordingFetcher({})
    expect(await createInboxClient({ ...options, fetcher }).pending()).toEqual([])
  })

  it('absorbs a proposal by applying it', async () => {
    const { calls, fetcher } = recordingFetcher({})
    await createInboxClient({ ...options, fetcher }).absorb('proposal-1')

    expect(calls[0]?.url).toBe('http://localhost:4321/workspaces/knowledge/proposals/proposal-1/apply')
    expect(calls[0]?.init?.method).toBe('POST')
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ userId: 'reader' })
  })

  it('discards a proposal under a stable reason code, never display text', async () => {
    const { calls, fetcher } = recordingFetcher({})
    await createInboxClient({ ...options, fetcher, userId: 'kd' }).discard('proposal-1')

    expect(calls[0]?.url).toBe('http://localhost:4321/workspaces/knowledge/proposals/proposal-1/reject')
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ userId: 'kd', reason: 'not-absorbed' })
  })

  it('reports a failed read and a failed write', async () => {
    const { fetcher } = recordingFetcher({}, false)
    const client = createInboxClient({ ...options, fetcher })

    await expect(client.pending()).rejects.toThrow(/failed with 500/)
    await expect(client.absorb('proposal-1')).rejects.toThrow(/failed with 500/)
  })

  it('tolerates a trailing slash on the api url', async () => {
    const { calls, fetcher } = recordingFetcher({ items: [] })
    await createInboxClient({ ...options, apiUrl: 'http://localhost:4321/', fetcher }).pending()

    expect(calls[0]?.url).toBe('http://localhost:4321/workspaces/knowledge/proposals?status=pending')
  })
})

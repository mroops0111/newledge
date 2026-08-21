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
      payload: {
        id: 'kdanSeriesB2021',
        type: 'Source',
        name: 'TechCrunch report',
        metadata: { sourceReferences: [{ location: { uri: 'https://techcrunch.com/a' } }] },
      },
    },
    {
      operation: 'addNodes',
      payloads: [
        { id: 'kdan', type: 'Concept', name: 'KDAN', description: 'A Taiwan-based software company.' },
        { id: 'dottedSign', type: 'Concept', name: 'DottedSign' },
        {
          id: 'seriesB16M',
          type: 'Claim',
          name: 'Kdan raised a $16M Series B',
          metadata: { sourceReferences: [{ sourceId: 'kdanSeriesB2021', location: { uri: 'https://techcrunch.com/a' } }] },
        },
      ],
    },
    { operation: 'addNode', payload: { id: 'funding', type: 'Topic', name: 'Funding' } },
    { operation: 'addEdge', payload: { type: 'introduces', fromNodeId: 'kdanSeriesB2021', toNodeId: 'kdan' } },
  ],
}

const readingsOf = (card: ReturnType<typeof toCard>) => card.groups.flatMap(g => g.readings)

describe('toCard', () => {
  const card = toCard(proposal)

  it('groups a proposal into what it asks you to absorb', () => {
    expect(readingsOf(card).map(r => r.concept.id)).toEqual(['kdan', 'dottedSign'])
    expect(card.sources.map(s => s.id)).toEqual(['kdanSeriesB2021'])
    expect(card.conceptCount).toBe(2)
    expect(card.claimCount).toBe(1)
  })

  it('keeps a claim that concerns nothing rather than dropping it', () => {
    expect(card.looseClaims.map(c => c.node.id)).toEqual(['seriesB16M'])
    expect(readingsOf(card).flatMap(r => r.claims)).toEqual([])
  })

  it('hangs a claim under the concept it concerns', () => {
    const withSubject = {
      ...proposal,
      operations: [
        ...proposal.operations,
        { operation: 'addEdge', payload: { type: 'concerns', fromNodeId: 'seriesB16M', toNodeId: 'kdan' } },
      ],
    }
    const grouped = toCard(withSubject)

    expect(readingsOf(grouped).find(r => r.concept.id === 'kdan')?.claims.map(c => c.node.id)).toEqual(['seriesB16M'])
    expect(readingsOf(grouped).find(r => r.concept.id === 'dottedSign')?.claims).toEqual([])
    expect(grouped.looseClaims).toEqual([])
    expect(grouped.claimCount).toBe(1)
  })

  it('separates edges from nodes', () => {
    expect(card.edges).toEqual([{ type: 'introduces', fromNodeId: 'kdanSeriesB2021', toNodeId: 'kdan' }])
  })

  it('names each source rather than reducing it to a host', () => {
    expect(card.sources).toEqual([{ id: 'kdanSeriesB2021', index: 1, title: 'TechCrunch report', url: 'https://techcrunch.com/a' }])
  })

  it('files concepts under the themes they belong to, and the rest last', () => {
    const themed = {
      ...proposal,
      operations: [
        ...proposal.operations,
        { operation: 'addEdge', payload: { type: 'belongsTo', fromNodeId: 'kdan', toNodeId: 'funding' } },
      ],
    }
    const card = toCard(themed)

    expect(card.groups.map(g => [g.title, g.readings.map(r => r.concept.id)])).toEqual([
      ['Funding', ['kdan']],
      ['Not filed under a theme', ['dottedSign']],
    ])
  })

  it('drops a theme that nothing belongs to', () => {
    expect(card.groups.map(g => g.title)).toEqual(['Not filed under a theme'])
  })

  it('keeps the rationale as the opening line of the card', () => {
    expect(card.rationale).toContain('Extracted one Source')
  })

  it('reads a claim under every concept it concerns, since aboutness is many to many', () => {
    const tying = {
      ...proposal,
      operations: [
        ...proposal.operations,
        { operation: 'addEdge', payload: { type: 'concerns', fromNodeId: 'seriesB16M', toNodeId: 'kdan' } },
        { operation: 'addEdge', payload: { type: 'concerns', fromNodeId: 'seriesB16M', toNodeId: 'dottedSign' } },
      ],
    }
    const card = toCard(tying)

    expect(readingsOf(card).map(r => r.claims.map(c => c.node.id))).toEqual([['seriesB16M'], ['seriesB16M']])
    expect(card.looseClaims).toEqual([])
    expect(card.claimCount).toBe(1)
  })

  it('sets a claim aside when it concerns a concept this proposal does not carry', () => {
    const elsewhere = {
      ...proposal,
      operations: [
        ...proposal.operations,
        { operation: 'addEdge', payload: { type: 'concerns', fromNodeId: 'seriesB16M', toNodeId: 'someOtherConcept' } },
      ],
    }
    const card = toCard(elsewhere)

    expect(card.looseClaims.map(c => c.node.id)).toEqual(['seriesB16M'])
    expect(readingsOf(card).flatMap(r => r.claims)).toEqual([])
  })

  it('numbers the source a claim traces to, so provenance rides beside the text', () => {
    expect(card.sources.map(s => s.index)).toEqual([1])
    expect(card.looseClaims[0]?.cites.map(c => c.index)).toEqual([1])
    expect(card.looseClaims[0]?.cites[0]?.title).toBe('TechCrunch report')
  })

  it('runs citation markers in reading order, whatever order the node lists them', () => {
    const twoSourced = {
      ...proposal,
      operations: [
        { operation: 'addNodes', payloads: [
          { id: 'first', type: 'Source', name: 'First', metadata: { sourceReferences: [{ location: { uri: 'https://a.example' } }] } },
          { id: 'second', type: 'Source', name: 'Second', metadata: { sourceReferences: [{ location: { uri: 'https://b.example' } }] } },
          // The node names its most representative source first,
          // which is the second entry in the card's list.
          { id: 'cl', type: 'Claim', name: 'A claim', metadata: { sourceReferences: [
            { location: { uri: 'https://b.example' } },
            { location: { uri: 'https://a.example' } },
          ] } },
        ] },
      ],
    }
    expect(toCard(twoSourced).looseClaims[0]?.cites.map(c => c.index)).toEqual([1, 2])
  })

  it('cites nothing for a node whose sources are not in this proposal', () => {
    const orphan = {
      ...proposal,
      operations: [
        { operation: 'addNodes', payloads: [
          { id: 'lonely', type: 'Claim', name: 'A claim from elsewhere', metadata: { sourceReferences: [{ location: { uri: 'https://absent.example/x' } }] } },
        ] },
      ],
    }
    expect(toCard(orphan).looseClaims[0]?.cites).toEqual([])
  })

  it('tolerates a proposal with no operations', () => {
    expect(toCard({ ...proposal, operations: [] }).groups).toEqual([])
  })

  it('ignores a payload that is neither a node nor an edge', () => {
    const noise = { operation: 'addNode', payload: null }
    const stray = { operation: 'addNode', payloads: [{ nothing: 'useful' }] }
    const card = toCard({ ...proposal, operations: [noise, stray] })

    expect(card.groups).toEqual([])
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

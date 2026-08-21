import type { Board, BoardState } from '@newledge/board'
import { describe, expect, it } from 'vitest'
import {
  createBoardClient,
  renameSection,
  withBoard,
  withCard,
  withSection,
} from '../src/lib/boards.js'

function board(over: Partial<Board> = {}): Board {
  return { id: 'b1', name: 'Retrieval', cards: [], sections: [], ...over }
}

describe('keeping one board among several', () => {
  it('replaces the one it names, leaving the others alone', () => {
    const state: BoardState = { boards: [board(), board({ id: 'b2', name: 'Agents' })] }
    const next = withBoard(state, board({ name: 'Retrieval augmented' }))
    expect(next.boards.map(one => one.name)).toEqual(['Retrieval augmented', 'Agents'])
  })

  it('adds a board the state has never seen', () => {
    const next = withBoard({ boards: [board()] }, board({ id: 'b2', name: 'Agents' }))
    expect(next.boards).toHaveLength(2)
  })
})

describe('putting something on a board', () => {
  it('lands an arrival clear of everything already arranged', () => {
    const arranged = board({
      cards: [{ nodeId: 'rag', x: 0, y: 0 }],
      sections: [{ id: 's1', name: 'Basics', x: 0, y: 0, width: 600, height: 200 }],
    })
    const [arrival] = withCard(arranged, 'graphRag').cards.slice(-1)
    expect(arrival!.x).toBeGreaterThan(600)
  })

  it('lands a second arrival beside the first, not on top of it', () => {
    const two = withCard(withCard(board(), 'rag'), 'graphRag')
    const [first, second] = two.cards
    expect(second!.x).toBeGreaterThan(first!.x)
  })

  it('leaves a board alone when what was chosen is already on it', () => {
    const once = withCard(board(), 'rag')
    expect(withCard(once, 'rag')).toBe(once)
  })
})

describe('drawing a section', () => {
  it('gives it an extent, so there is something to drop a card into', () => {
    const [section] = withSection(board()).sections
    expect(section!.width).toBeGreaterThan(0)
    expect(section!.height).toBeGreaterThan(0)
  })

  it('lands clear of the cards already there, so it starts empty', () => {
    const arranged = board({ cards: [{ nodeId: 'rag', x: 80, y: 120 }] })
    const [section] = withSection(arranged).sections
    expect(section!.x).toBeGreaterThan(arranged.cards[0]!.x)
  })

  it('never reuses an id a section already answers to', () => {
    const drawn = withSection(withSection(board({
      sections: [{ id: 'section-1', name: 'Basics', x: 0, y: 0, width: 10, height: 10 }],
    })))
    const ids = drawn.sections.map(section => section.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('renames the one it names and no other', () => {
    const two = withSection(withSection(board()))
    const renamed = renameSection(two, two.sections[0]!.id, 'Basics')
    expect(renamed.sections[0]!.name).toBe('Basics')
    expect(renamed.sections[1]!.name).toBe(two.sections[1]!.name)
  })
})

describe('talking to the workspace about boards', () => {
  const options = { apiUrl: 'http://localhost:4321/', workspaceId: 'knowledge' }

  it('reads the arrangement the workspace is holding', async () => {
    const asked: string[] = []
    const client = createBoardClient({
      ...options,
      fetcher: async (input) => {
        asked.push(String(input))
        return new Response(JSON.stringify({ boards: [board()] }), { status: 200 })
      },
    })
    expect((await client.read()).boards).toHaveLength(1)
    expect(asked[0]).toBe('http://localhost:4321/workspaces/knowledge/boards')
  })

  it('says so when the workspace will not hand its boards back', async () => {
    const client = createBoardClient({ ...options, fetcher: async () => new Response('', { status: 500 }) })
    await expect(client.read()).rejects.toThrow('500')
  })

  it('sends the whole arrangement, since that is what a board is', async () => {
    let sent: string | undefined
    const client = createBoardClient({
      ...options,
      fetcher: async (_input, init) => {
        sent = String(init?.body)
        return new Response('', { status: 200 })
      },
    })
    await client.keep({ boards: [board()] })
    expect(JSON.parse(sent!)).toEqual({ boards: [board()] })
  })

  it('says so when an arrangement was refused', async () => {
    const client = createBoardClient({ ...options, fetcher: async () => new Response('', { status: 400 }) })
    await expect(client.keep({ boards: [] })).rejects.toThrow('400')
  })
})

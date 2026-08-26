import type { Board, BoardState } from '@newledge/board'
import { describe, expect, it } from 'vitest'
import {
  createBoardClient,
  newBoard,
  openingBoards,
  renameSection,
  withBoard,
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

describe('a board a reader added', () => {
  it('takes an id nothing has taken', () => {
    const state = { boards: [board({ id: 'board-1' }), board({ id: 'board-2' })] }
    expect(state.boards.some(one => one.id === newBoard(state).id)).toBe(false)
  })

  it('says nothing about which kinds it holds, so it opens on the widest reading', () => {
    expect(newBoard({ boards: [] }).holds).toBeUndefined()
  })

  it('opens empty, for the arrangement to fill', () => {
    const fresh = newBoard({ boards: [] })
    expect(fresh.cards).toEqual([])
    expect(fresh.sections).toEqual([])
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

describe('the boards a workspace opens on', () => {
  const nodes = [
    { id: 'a', type: 'Concept', name: 'A' },
    { id: 'b', type: 'Claim', name: 'B' },
    { id: 'c', type: 'Source', name: 'C' },
    { id: 'd', type: 'Topic', name: 'D' },
  ]

  it('reads one graph two ways', () => {
    expect(openingBoards(nodes).map(board => board.name))
      .toEqual(['Terms', 'Terms and sources'])
  })

  it('differs in nothing but which kinds each one holds', () => {
    const [terms, sources] = openingBoards(nodes)
    expect(terms!.holds).toEqual(['Concept'])
    expect(sources!.holds).toEqual(['Concept', 'Source'])
  })

  // A claim is evidence about a concept,
  // read inside the concept rather than arranged beside it,
  // so no board opens holding one.
  it('leaves out a kind no board places', () => {
    expect(openingBoards(nodes).flatMap(board => board.holds)).not.toContain('Claim')
  })

  it('reads the last one off the graph, so a growing ontology is not left behind', () => {
    const richer = [...nodes, { id: 'e', type: 'Question', name: 'E' }]
    expect(openingBoards(richer).at(-1)!.holds).toContain('Question')
  })

  it('opens one board on a graph whose only placeable kind is the first', () => {
    expect(openingBoards([
      { id: 'a', type: 'Concept', name: 'A' },
      { id: 'b', type: 'Claim', name: 'B' },
    ]).map(board => board.name)).toEqual(['Terms'])
  })

  it('leaves a ground out, since a topic is drawn as the section itself', () => {
    expect(openingBoards(nodes).flatMap(board => board.holds)).not.toContain('Topic')
  })

  it('drops a board with nothing to hold rather than opening it empty', () => {
    expect(openingBoards([{ id: 'd', type: 'Topic', name: 'D' }])).toEqual([])
  })

  it('opens one board on a graph of one kind, not the same board three times', () => {
    const plain = openingBoards([{ id: 'a', type: 'Concept', name: 'A' }])
    expect(plain).toHaveLength(1)
    expect(plain[0]!.holds).toEqual(['Concept'])
  })
})

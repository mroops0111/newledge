import { describe, expect, it } from 'vitest'
import type { Board as BoardShape, Section } from '../src/index.js'
import { Board, BoardState, moveSection, sectionHolding } from '../src/index.js'

function section(id: string, x: number, y: number): Section {
  return { id, name: id, x, y, width: 200, height: 200 }
}

describe('board schema', () => {
  it('fills in the parts a new board has none of yet', () => {
    expect(Board.parse({ id: 'b1', name: 'Retrieval' })).toEqual({
      id: 'b1',
      name: 'Retrieval',
      cards: [],
      sections: [],
    })
  })

  it('keeps only the node id, so a card cannot drift from the graph', () => {
    const parsed = Board.parse({
      id: 'b1',
      name: 'Retrieval',
      cards: [{ nodeId: 'rag', x: 1, y: 2, name: 'stale copy' }],
    })
    expect(parsed.cards[0]).toEqual({ nodeId: 'rag', x: 1, y: 2 })
  })

  it('rejects a section with no extent, since a reader could never drop into it', () => {
    expect(() => Board.parse({
      id: 'b1',
      name: 'Retrieval',
      sections: [{ id: 's1', name: 'Basics', x: 0, y: 0, width: 0, height: 10 }],
    })).toThrow()
  })

  it('reads a workspace with no boards yet', () => {
    expect(BoardState.parse({})).toEqual({ boards: [] })
  })
})

describe('sectionHolding', () => {
  const sections = [section('s1', 0, 0), section('s2', 500, 500)]

  it('finds the section a card was dropped into', () => {
    expect(sectionHolding({ x: 50, y: 50 }, sections)?.id).toBe('s1')
    expect(sectionHolding({ x: 550, y: 550 }, sections)?.id).toBe('s2')
  })

  it('holds a card on the boundary, so a drop at the edge still counts', () => {
    expect(sectionHolding({ x: 200, y: 200 }, sections)?.id).toBe('s1')
  })

  it('leaves a card outside every section unheld', () => {
    expect(sectionHolding({ x: 300, y: 300 }, sections)).toBeUndefined()
  })
})

describe('moveSection', () => {
  const board: BoardShape = {
    id: 'b1',
    name: 'Retrieval',
    sections: [section('s1', 0, 0)],
    cards: [
      { nodeId: 'inside', x: 50, y: 50 },
      { nodeId: 'outside', x: 400, y: 400 },
    ],
  }

  it('carries what sits inside, and leaves the rest', () => {
    const moved = moveSection(board, 's1', { x: 100, y: 20 })

    expect(moved.sections[0]).toMatchObject({ x: 100, y: 20 })
    expect(moved.cards.find(card => card.nodeId === 'inside')).toEqual({ nodeId: 'inside', x: 150, y: 70 })
    expect(moved.cards.find(card => card.nodeId === 'outside')).toEqual({ nodeId: 'outside', x: 400, y: 400 })
  })

  it('keeps the arrangement within a section rather than relaying it out', () => {
    const two = { ...board, cards: [{ nodeId: 'a', x: 10, y: 10 }, { nodeId: 'b', x: 60, y: 90 }] }
    const moved = moveSection(two, 's1', { x: 1000, y: 1000 })
    const [a, b] = moved.cards

    expect(b!.x - a!.x).toBe(50)
    expect(b!.y - a!.y).toBe(80)
  })

  it('leaves a board untouched when the section is not on it', () => {
    expect(moveSection(board, 'gone', { x: 1, y: 1 })).toBe(board)
  })
})

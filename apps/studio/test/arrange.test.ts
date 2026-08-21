import { sectionHolding } from '@newledge/board'
import { describe, expect, it } from 'vitest'
import { firstArrangement } from '../src/lib/arrange.js'
import type { GraphEdge, GraphNode } from '../src/lib/graph.js'

function node(id: string, type: string, name = id): GraphNode {
  return { id, type, name }
}

function edge(type: string, from: string, to: string): GraphEdge {
  return { id: `${type}-${from}-${to}`, type, fromNodeId: from, toNodeId: to }
}

const graph = {
  nodes: [
    node('retrieval', 'Topic', 'Retrieval'),
    node('agents', 'Topic', 'Agents'),
    node('empty', 'Topic', 'Nothing filed here'),
    node('rag', 'Concept', 'RAG'),
    node('graphRag', 'Concept', 'GraphRAG'),
    node('planner', 'Concept', 'Planner'),
    node('embedding', 'Concept', 'Embedding'),
    node('faster', 'Claim', 'GraphRAG answers faster'),
    node('paper', 'Source', 'A paper'),
    node('stray', 'Source', 'Nobody cites this'),
  ],
  edges: [
    edge('belongsTo', 'rag', 'retrieval'),
    edge('belongsTo', 'graphRag', 'retrieval'),
    edge('belongsTo', 'planner', 'agents'),
    edge('concerns', 'faster', 'graphRag'),
    edge('introduces', 'paper', 'faster'),
  ],
}

describe('what a board opens on', () => {
  const board = firstArrangement(graph)

  it('places every node the graph holds, so nothing is hiding off the board', () => {
    expect(board.cards.map(card => card.nodeId).sort())
      .toEqual(['embedding', 'faster', 'graphRag', 'paper', 'planner', 'rag', 'stray'])
  })

  it('draws a topic as its section rather than as a card among its members', () => {
    expect(board.cards.some(card => card.nodeId === 'retrieval')).toBe(false)
    expect(board.sections.map(section => section.name).sort()).toEqual(['Agents', 'Retrieval'])
  })

  it('drops a node inside the section standing for the topic it is filed under', () => {
    const retrieval = board.sections.find(section => section.name === 'Retrieval')!
    const rag = board.cards.find(card => card.nodeId === 'rag')!
    expect(sectionHolding(rag, [retrieval])).toBeDefined()
  })

  it('sits a claim nobody filed with the concept it is about', () => {
    const retrieval = board.sections.find(section => section.name === 'Retrieval')!
    const faster = board.cards.find(card => card.nodeId === 'faster')!
    expect(sectionHolding(faster, [retrieval])).toBeDefined()
  })

  it('sits a source with what it introduced, one step further out', () => {
    const retrieval = board.sections.find(section => section.name === 'Retrieval')!
    const paper = board.cards.find(card => card.nodeId === 'paper')!
    expect(sectionHolding(paper, [retrieval])).toBeDefined()
  })

  it('leaves a node with nothing to sit beside out in the open', () => {
    for (const id of ['embedding', 'stray']) {
      const loose = board.cards.find(card => card.nodeId === id)!
      expect(sectionHolding(loose, board.sections)).toBeUndefined()
    }
  })

  it('draws no two sections over each other', () => {
    expectNoOverlap(board.sections)
  })

  it('wraps onto another row instead of running off to the side forever', () => {
    const many = Array.from({ length: 8 }, (_unused, index) => index)
    const wide = firstArrangement({
      nodes: [
        ...many.map(index => node(`topic${index}`, 'Topic', `Topic ${index}`)),
        ...many.flatMap(index => [0, 1, 2].map(seat => node(`concept${index}-${seat}`, 'Concept'))),
      ],
      edges: many.flatMap(index =>
        [0, 1, 2].map(seat => edge('belongsTo', `concept${index}-${seat}`, `topic${index}`))),
    })
    expect(new Set(wide.sections.map(section => section.y)).size).toBeGreaterThan(1)
    expectNoOverlap(wide.sections)
  })

  it('arranges the same graph the same way every time', () => {
    expect(firstArrangement(graph)).toEqual(board)
  })

  it('opens on an empty board when nothing has been absorbed yet', () => {
    const nothing = firstArrangement({ nodes: [], edges: [] })
    expect(nothing.cards).toEqual([])
    expect(nothing.sections).toEqual([])
  })
})

interface Box { x: number, y: number, width: number, height: number }

function expectNoOverlap(boxes: readonly Box[]): void {
  for (const box of boxes) {
    const others = boxes.filter(candidate => candidate !== box)
    expect(others.some(other => overlaps(box, other))).toBe(false)
  }
}

function overlaps(one: Box, other: Box): boolean {
  return one.x < other.x + other.width
    && other.x < one.x + one.width
    && one.y < other.y + other.height
    && other.y < one.y + one.height
}
